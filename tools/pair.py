import json, re, datetime
d=json.load(open('raw.json',encoding='utf-8'))
msgs=[m for m in d if m['kind']=='msg'][::-1]
def ts(m):
    return datetime.datetime.strptime(m['time'][4:24],'%b %d %Y %H:%M:%S')
for m in msgs: m['t']=ts(m)
HINA='かみむらひな'; ISO='磯部裕貴'
norm=lambda s: re.sub(r'\s+','',s or '')
questions=[]   # dict: id, t, text, images[], answers[], quote
# 1) ひなのテキスト＝質問
hina=[m for m in msgs if m['sender']==HINA]
for i,m in enumerate(hina):
    if m['type']=='textMessageContent' or (m.get('isReply') and m['innerType']=='textMessageContent'):
        q={'id':m['id'],'t':m['t'],'text':(m['text'] or '').strip(),'images':[],'answers':[],'quote':m.get('quoteText') if m.get('isReply') else None}
        questions.append(q)
# 2) 画像の割り当て: 直後3秒以内のテキスト or 次のひなテキスト
qs_by_t=sorted(questions,key=lambda q:q['t'])
for m in hina:
    if m['type']!='imageMessageContent': continue
    before=[q for q in qs_by_t if 0<=(m['t']-q['t']).total_seconds()<=3]
    after=[q for q in qs_by_t if q['t']>=m['t']]
    target=before[0] if before else (after[0] if after else None)
    if target: target['images'].append(m['id'])
    else: print('unassigned image',m['id'],m['t'])
# 3) 画像なしの質問は直前の質問の画像を引き継ぐ（10分以内）
for i,q in enumerate(qs_by_t):
    if not q['images'] and i>0 and (q['t']-qs_by_t[i-1]['t']).total_seconds()<600:
        q['images']=list(qs_by_t[i-1]['images']); q['inherited']=True
# 4) 磯部の回答を割り当て
iso=[m for m in msgs if m['sender']==ISO]
last_q=None; unmatched=[]
for m in iso:
    txt=m['text'] or ''
    if m.get('isReply') and m.get('quoteText'):
        qt=norm(m['quoteText'])
        before=[q for q in qs_by_t if q['t']<m['t']]
        exact=[q for q in before if norm(q['text'])==qt]
        cands=exact or [q for q in before if norm(q['text']).startswith(qt) or qt.startswith(norm(q['text']))]
        if cands:
            un=[q for q in cands if not q['answers']]
            q=(un[0] if len(cands)>1 and un else cands[-1]); q['answers'].append({'id':m['id'],'t':m['t'],'text':txt}); last_q=q; continue
        # 自分の回答を引用した補足
        for q in before:
            for a in q['answers']:
                if norm(a['text'])==qt:
                    q['answers'].append({'id':m['id'],'t':m['t'],'text':txt,'note':'補足'}); last_q=q; break
            else: continue
            break
        else:
            unmatched.append((m['id'],m['t'],m['quoteText'],txt[:40]))
        continue
        unmatched.append((m['id'],m['t'],m['quoteText'],txt[:40]))
    elif m.get('isReply'):
        # 画像への返信など: 直前のひな質問（回答時刻より前で最も近い未回答優先）
        prev=[q for q in qs_by_t if q['t']<m['t']]
        q=next((x for x in reversed(prev) if not x['answers']), prev[-1] if prev else None)
        if q: q['answers'].append({'id':m['id'],'t':m['t'],'text':txt,'note':'画像への返信（紐付けは推定）'}); last_q=q
        else: unmatched.append((m['id'],m['t'],'(画像)',txt[:40]))
    elif m['type']=='imageMessageContent':
        if last_q: last_q['answers'].append({'id':m['id'],'t':m['t'],'text':'','image':m['id']})
    else:
        if last_q and (m['t']-last_q['answers'][-1]['t']).total_seconds()<900:
            last_q['answers'].append({'id':m['id'],'t':m['t'],'text':txt,'note':'補足'})
        else: unmatched.append((m['id'],m['t'],'(返信なし)',txt[:40]))
# 5) ひなの返信質問: 引用先の回答が属する質問の画像を引き継ぐ
for q in qs_by_t:
    if q['quote'] and not q.get('inherited') and not q['images']:
        for q2 in qs_by_t:
            if any(norm(a['text'])==norm(q['quote']) for a in q2['answers']) or norm(q2['text'])==norm(q['quote']):
                q['images']=list(q2['images']); q['inherited']=True; q['parent']=q2['id']; break
for i,q in enumerate(qs_by_t):
    if not q['images'] and i>0 and (q['t']-qs_by_t[i-1]['t']).total_seconds()<600:
        q['images']=list(qs_by_t[i-1]['images']); q['inherited']=True
# 6) 回答なしの追記（画像引継）は直前の質問に補足として結合
merged=[]
for i,q in enumerate(qs_by_t):
    if not q['answers'] and q.get('inherited') and i>0 and (q['t']-qs_by_t[i-1]['t']).total_seconds()<600 and not q['quote']:
        qs_by_t[i-1].setdefault('extra',[]).append(q['text']); q['merged']=True
qs_by_t=[q for q in qs_by_t if not q.get('merged')]
out=[]
for q in qs_by_t:
    out.append({'id':q['id'],'date':q['t'].strftime('%Y-%m-%d'),'time':q['t'].strftime('%H:%M'),'question':q['text'],'extra':q.get('extra',[]),'quote':q['quote'],'images':q['images'],'inherited':q.get('inherited',False),
                'answers':[{'id':a['id'],'time':a['t'].strftime('%m/%d %H:%M'),'text':a['text'],**({'image':a['image']} if a.get('image') else {}),**({'note':a['note']} if a.get('note') else {})} for a in q['answers']]})
json.dump(out,open('paired.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
with open('report.txt','w',encoding='utf-8') as f:
    f.write(f'questions={len(out)} answered={sum(1 for q in out if q["answers"])} with_images={sum(1 for q in out if q["images"])}\n')
    f.write('UNMATCHED:\n'); [f.write(str(u)+'\n') for u in unmatched]
    for q in out:
        f.write(f"\n[{q['date']} {q['time']}] img={len(q['images'])}{'(引継)' if q['inherited'] else ''} Q: {q['question'][:70]!r}" + (f" (quote:{q['quote'][:20]!r})" if q['quote'] else '') + '\n')
        for a in q['answers']: f.write(f"    A: {a['text'][:80]!r} {a.get('note','')} {('[img]' if a.get('image') else '')}\n")
