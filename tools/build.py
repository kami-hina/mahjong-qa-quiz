# paired.json → data/questions.json（画像ファイルの存在を確認して出力）
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
imgdir = os.path.join(root, 'images')
files = {f.rsplit('.', 1)[0]: f for f in os.listdir(imgdir)} if os.path.isdir(imgdir) else {}
src = json.load(open(os.path.join(here, 'paired.json'), encoding='utf-8'))
missing = []
out = []
for q in src:
    imgs = []
    for i in q['images']:
        if i in files: imgs.append(files[i])
        else: missing.append(i)
    answers = []
    for a in q['answers']:
        a = dict(a)
        if a.get('image'):
            if a['image'] in files: a['image'] = files[a['image']]
            else: missing.append(a['image']); a.pop('image')
        answers.append(a)
    out.append({**q, 'images': imgs, 'answers': answers})
os.makedirs(os.path.join(root, 'data'), exist_ok=True)
json.dump(out, open(os.path.join(root, 'data', 'questions.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('questions', len(out), 'with answers', sum(1 for q in out if q['answers']), 'missing images', len(missing))
