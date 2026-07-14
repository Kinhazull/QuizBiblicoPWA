import csv, json, re, unicodedata, difflib, collections, math
from pathlib import Path

ROOT = Path(__file__).parent

def norm(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

STOP = set(norm('a o as os um uma de da do das dos em no na nos nas e ou que qual quais quem como segundo sobre para por seu sua seus suas foi era é são será foram tinha tem lhe lhes ele ela eles elas isso isto aquilo ao aos à às se').split())
def tokens(s): return {x for x in norm(s).split() if len(x)>2 and x not in STOP}

with (ROOT/'Quiz.csv').open(encoding='cp1252', newline='') as f:
    rows = list(csv.DictReader(f, delimiter=';'))

bible = json.load((ROOT/'bible-almeida.json').open(encoding='utf-8'))
books = {norm(b['name']): b for b in bible['books']}
aliases = {
 'gn':'genesis','ex':'exodo','lv':'levitico','nm':'numeros','dt':'deuteronomio','js':'josue','jz':'juizes','rt':'rute',
 '1sm':'1 samuel','2sm':'2 samuel','1rs':'1 reis','2rs':'2 reis','1cr':'1 cronicas','2cr':'2 cronicas','ed':'esdras','ne':'neemias','et':'ester',
 'jo':'jo','sl':'salmos','pv':'proverbios','ec':'eclesiastes','ct':'cantares','is':'isaias','jr':'jeremias','lm':'lamentacoes','ez':'ezequiel','dn':'daniel',
 'os':'oseias','jl':'joel','am':'amos','ob':'obadias','jn':'jonas','mq':'miqueias','na':'naum','hc':'habacuque','sf':'sofonias','ag':'ageu','zc':'zacarias','ml':'malaquias',
 'mt':'mateus','mc':'marcos','lc':'lucas','jo':'joao','at':'atos','rm':'romanos','1co':'1 corintios','2co':'2 corintios','gl':'galatas','ef':'efesios',
 'fp':'filipenses','cl':'colossenses','1ts':'1 tessalonicenses','2ts':'2 tessalonicenses','1tm':'1 timoteo','2tm':'2 timoteo','tt':'tito','fm':'filemom',
 'hb':'hebreus','tg':'tiago','1pe':'1 pedro','2pe':'2 pedro','1jo':'1 joao','2jo':'2 joao','3jo':'3 joao','jd':'judas','ap':'apocalipse'
}
books['cantares'] = books.get('cantico dos canticos')
# Correct ambiguity: Jo means João in this dataset; Jó appears as "Jó" and maps by book column.

def parse_reference(ref, book_name):
    m = re.search(r'([1-3]?\s*[A-Za-zÀ-ÿ]+)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?', ref)
    if not m: return None, 'Formato de referência não reconhecido'
    abbrev = norm(m.group(1)).replace(' ','')
    target = norm(book_name)
    if target not in books:
        target = aliases.get(abbrev, target)
    book = books.get(target)
    if not book: return None, 'Livro não localizado na base Almeida'
    ch, v1, v2 = int(m.group(2)), int(m.group(3)), int(m.group(4) or m.group(3))
    if ch < 1 or ch > len(book['chapters']): return None, 'Capítulo inexistente'
    verses = book['chapters'][ch-1]['verses']
    if v1 < 1 or v2 > len(verses) or v2 < v1: return None, 'Versículo inexistente'
    return ' '.join(x['text'].strip() for x in verses[v1-1:v2]), ''

prompt_groups = collections.defaultdict(list)
for i,r in enumerate(rows): prompt_groups[norm(r['enunciado'])].append(i)
duplicate_of = {}
for ids in prompt_groups.values():
    for idx in ids[1:]: duplicate_of[idx] = ids[0]

# Near duplicates using token blocking and SequenceMatcher.
near = {}
blocks = collections.defaultdict(set)
for i,r in enumerate(rows):
    for t in sorted(tokens(r['enunciado']))[:8]: blocks[t].add(i)
for i,r in enumerate(rows):
    cand=set()
    for t in tokens(r['enunciado']): cand |= blocks.get(t,set())
    best=(0,None)
    ni=norm(r['enunciado'])
    for j in cand:
        if j>=i or j in duplicate_of: continue
        nj=norm(rows[j]['enunciado'])
        ratio=difflib.SequenceMatcher(None,ni,nj).ratio()
        jac=len(tokens(ni)&tokens(nj))/max(1,len(tokens(ni)|tokens(nj)))
        score=max(ratio, jac)
        if score>best[0]: best=(score,j)
    if best[0]>=0.82: near[i]=best

theme_counts=collections.Counter(norm(r['tema']) for r in rows)
cat_counts=collections.Counter(norm(r['categoria']) for r in rows)
answer_counts=collections.Counter(r['correta'].strip().upper() for r in rows)

audits=[]
for i,r in enumerate(rows):
    issues=[]; suggestions=[]; priority=3
    correct_letter=r['correta'].strip().upper(); ci='ABCD'.index(correct_letter)
    choices=[r[f'alternativa_{x}'].strip() for x in 'abcd']; correct=choices[ci]
    verse, ref_error=parse_reference(r['referencia'],r['livro'])
    if ref_error: issues.append('REFERÊNCIA: '+ref_error); priority=1
    else:
        vt=tokens(verse); scores=[]
        context=tokens(verse+' '+r['comentario'])
        for c in choices:
            ct=tokens(c); scores.append(len(ct&context)/max(1,len(ct)))
        rank=sorted(range(4),key=lambda k:scores[k],reverse=True)
        if scores[ci] < 0.18 and len(tokens(correct))>=2:
            issues.append('VALIDAÇÃO: resposta com baixa aderência textual à referência/comentário'); priority=min(priority,1)
        elif rank[0] != ci and scores[rank[0]] >= scores[ci]+0.25:
            issues.append(f'VALIDAÇÃO: alternativa {"ABCD"[rank[0]]} parece mais aderente ao texto que a marcada'); priority=min(priority,1)
        elif scores[ci] < 0.35:
            issues.append('VALIDAÇÃO: conferir interpretação/tradução manualmente'); priority=min(priority,2)
    if i in duplicate_of:
        issues.append(f'DUPLICATA EXATA da linha {duplicate_of[i]+2}'); suggestions.append('Excluir desta base'); priority=1
    elif i in near:
        score,j=near[i]; issues.append(f'PERGUNTA PARECIDA com linha {j+2} ({score:.0%})'); suggestions.append('Diferenciar o enfoque ou manter apenas a melhor'); priority=min(priority,2)
    if len(set(norm(c) for c in choices))<4:
        issues.append('ALTERNATIVAS repetidas'); priority=1
    lengths=[len(c) for c in choices]
    if lengths[ci] >= max(lengths) and lengths[ci] > (sum(lengths)-lengths[ci])/3*1.65:
        issues.append('PISTA: resposta correta muito mais longa que as demais'); suggestions.append('Equilibrar o tamanho e a especificidade das alternativas'); priority=min(priority,2)
    vague = re.search(r'\b(ele|ela|eles|elas|isso|aquilo|ali|lá|esse|essa|este|esta)\b', norm(r['enunciado']))
    if vague and not re.search(r'\b(segundo|em|no|na)\b', norm(r['enunciado'])):
        issues.append('CLAREZA: pronome/contexto possivelmente ambíguo'); priority=min(priority,2)
    if re.search(r'\b(nao|exceto|incorreta|errada)\b', norm(r['enunciado'])):
        issues.append('CLAREZA: enunciado negativo exige atenção extra'); priority=min(priority,2)
    if cat_counts[norm(r['categoria'])] <= 2:
        issues.append('TAXONOMIA: categoria rara (1–2 ocorrências)'); suggestions.append('Consolidar em categoria mais ampla'); priority=min(priority,2)
    # Difficulty heuristic, intentionally conservative.
    qn=norm(r['enunciado']); proposed=r['dificuldade']
    common=bool(re.search(r'\b(quem|onde|quantos|qual nome|o que)\b',qn)) and len(correct.split())<=5
    precise=len(correct.split())>=10 or bool(re.search(r'\b(segundo|complet|declar|escreveu|significa)\b',qn))
    if r['dificuldade']=='Difícil' and common: proposed='Média'; issues.append('DIFICULDADE: parece mais simples que “Difícil”'); priority=min(priority,2)
    elif r['dificuldade']=='Fácil' and precise: proposed='Média'; issues.append('DIFICULDADE: exige detalhe/recitação além de “Fácil”'); priority=min(priority,2)
    status='Excluir duplicata' if i in duplicate_of else ('Revisar' if issues else 'Aprovada provisoriamente')
    confidence='Não validada' if ref_error else ('Baixa' if any(x.startswith('VALIDAÇÃO:') for x in issues) else 'Moderada')
    audits.append({
      'linha_csv':i+2,'status_revisao':status,'prioridade':priority,'problemas':' | '.join(issues) or 'Sem alerta automático',
      'recomendacao':' | '.join(suggestions) or 'Manter; revisão humana final recomendada','duplicata_de':duplicate_of.get(i,'') and duplicate_of[i]+2,
      'similar_a':near.get(i,('',None))[1]+2 if i in near else '','similaridade':round(near[i][0],3) if i in near else '',
      'dificuldade_sugerida':proposed,'validacao_biblica':confidence,'texto_referencia_almeida':verse or '',**r
    })

summary={
 'total':len(rows),'exact_duplicate_rows':len(duplicate_of),'exact_duplicate_groups':sum(1 for v in prompt_groups.values() if len(v)>1),
 'near_duplicate_rows':len(near),'answer_distribution':dict(answer_counts),'theme_count':len(theme_counts),'category_count':len(cat_counts),
 'rare_categories':sum(1 for v in cat_counts.values() if v<=2),'status':dict(collections.Counter(a['status_revisao'] for a in audits)),
 'priority':dict(collections.Counter(str(a['prioridade']) for a in audits)),
 'reference_errors':sum('REFERÊNCIA:' in a['problemas'] for a in audits),'validation_alerts':sum('VALIDAÇÃO:' in a['problemas'] for a in audits),
 'difficulty_alerts':sum('DIFICULDADE:' in a['problemas'] for a in audits),'length_clues':sum('PISTA:' in a['problemas'] for a in audits)
}
(ROOT/'quiz_audit.json').write_text(json.dumps({'summary':summary,'rows':audits},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
