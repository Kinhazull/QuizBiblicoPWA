import csv, json, re, unicodedata, collections, random
from pathlib import Path

ROOT=Path(__file__).parent
def norm(s):
 s=unicodedata.normalize('NFD',str(s or '').lower());s=''.join(c for c in s if unicodedata.category(c)!='Mn');return re.sub(r'[^a-z0-9]+',' ',s).strip()
def toks(s): return {w for w in norm(s).split() if len(w)>2 and w not in {'que','qual','quem','como','para','com','dos','das','uma','por','seu','sua','ele','ela','foi','era','segundo','sobre'}}

with open(ROOT/'Quiz.csv',encoding='cp1252',newline='') as f: raw=list(csv.DictReader(f,delimiter=';'))
acf=json.load(open(ROOT/'bible-acf.json',encoding='utf-8-sig'))
by_name={norm(b['name']):b for b in acf}; by_id={b['id']:b for b in acf}
book_alias={'gn':'gn','ex':'ex','lv':'lv','nm':'nm','dt':'dt','js':'js','jz':'jud','rt':'rt','1sm':'1sm','2sm':'2sm','1rs':'1kgs','2rs':'2kgs','1cr':'1ch','2cr':'2ch','ed':'ezr','ne':'ne','et':'et','jo':'job','sl':'ps','pv':'prv','ec':'ec','ct':'so','is':'is','jr':'jr','lm':'lm','ez':'ez','dn':'dn','os':'ho','jl':'jl','am':'am','ob':'ob','jn':'jn','mq':'mi','na':'na','hc':'hk','sf':'zp','ag':'hg','zc':'zc','ml':'ml','mt':'mt','mc':'mk','lc':'lk','jo':'jo','at':'act','rm':'rm','1co':'1co','2co':'2co','gl':'gl','ef':'eph','fp':'ph','cl':'cl','1ts':'1ts','2ts':'2ts','1tm':'1tm','2tm':'2tm','tt':'tt','fm':'phm','hb':'hb','tg':'jm','1pe':'1pe','2pe':'2pe','1jo':'1jo','2jo':'2jo','3jo':'3jo','jd':'jd','ap':'re'}
name_override={'jo':{'Jó':'job','João':'jo'},'ct':{'Cantares':'so'}}
def get_ref(ref,book):
 m=re.match(r'\s*([1-3]?\s*[A-Za-zÀ-ÿ]+)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?\s*$',ref)
 if not m:return None,'Formato inválido'
 ab=norm(m.group(1)).replace(' ',''); bid=name_override.get(ab,{}).get(book) or book_alias.get(ab)
 b=by_id.get(bid); ch=int(m.group(2));v1=int(m.group(3));v2=int(m.group(4) or v1)
 if not b:return None,'Livro não localizado'
 if ch<1 or ch>len(b['chapters']):return None,'Capítulo inexistente'
 if v1<1 or v2>len(b['chapters'][ch-1]) or v2<v1:return None,'Versículo inexistente'
 return ' '.join(b['chapters'][ch-1][v1-1:v2]),''

def q(book,ref,prompt,correct,wrong,comment,theme='',category='',difficulty='Média'):
 return {'livro':book,'referencia':ref,'tema':theme,'categoria':category,'dificuldade':difficulty,'enunciado':prompt,
         'alternativa_a':correct,'alternativa_b':wrong[0],'alternativa_c':wrong[1],'alternativa_d':wrong[2],'correta':'A','comentario':comment,'origem':'Nova ACF'}

new=[
q('Jó','Jó 1:21','Como Jó reagiu inicialmente à perda de seus bens e filhos?','Adorou e reconheceu a soberania do Senhor',['Amaldiçoou seus amigos','Abandonou sua fé','Exigiu restituição imediata'],'Jó se prostrou, adorou e declarou que o nome do Senhor fosse bendito.','Poesia e Sabedoria','Sofrimento e fé','Média'),
q('Jó','Jó 19:25','Que certeza Jó afirmou em meio ao sofrimento?','Que o seu Redentor vive',['Que nunca morreria','Que seus amigos o salvariam','Que recuperaria tudo no mesmo dia'],'Jó declarou saber que o seu Redentor vive e que por fim se levantará sobre a terra.','Poesia e Sabedoria','Sofrimento e fé','Média'),
q('Eclesiastes','Ec 12:13','Qual conclusão encerra a reflexão do pregador?','Temer a Deus e guardar os seus mandamentos',['Buscar riquezas e prestígio','Evitar todo trabalho','Viver sem considerar o juízo'],'Eclesiastes resume o dever humano em temer a Deus e obedecer-lhe.','Poesia e Sabedoria','Temor do Senhor','Média'),
q('Cantares','Ct 8:7','Segundo Cantares, qual força não pode ser apagada nem pelas muitas águas?','O amor',['A memória','A sabedoria','A esperança'],'O texto ressalta a força e a permanência do amor.','Poesia e Sabedoria','Amor e compromisso','Fácil'),
q('Obadias','Ob 1:3','O que enganou Edom, segundo Obadias?','A soberba do seu coração',['A pobreza de suas cidades','A força de Judá','A falta de muralhas'],'A segurança de Edom em lugares altos alimentou sua soberba.','Profetas e Promessas','Juízo e arrependimento','Difícil'),
q('Naum','Na 1:7','Como Naum descreve o Senhor no dia da angústia?','Bom, fortaleza e conhecedor dos que nele confiam',['Distante dos aflitos','Indiferente às nações','Incapaz de julgar o mal'],'Naum une a bondade do Senhor à sua proteção dos que confiam nele.','Profetas e Promessas','Caráter de Deus','Média'),
q('Habacuque','Hc 2:4','Por que princípio o justo viverá?','Pela sua fé',['Pela força militar','Pela riqueza acumulada','Pelo reconhecimento público'],'Habacuque contrasta a soberba com a vida sustentada pela fé.','Profetas e Promessas','Fé e confiança','Fácil'),
q('Sofonias','Sf 3:17','Como o Senhor é apresentado no meio do seu povo?','Como poderoso que salva',['Como juiz ausente','Como mensageiro humano','Como rei sem autoridade'],'Sofonias anuncia a presença salvadora e jubilosa do Senhor.','Profetas e Promessas','Restauração','Média'),
q('Ageu','Ag 1:7','Que chamado o Senhor repetiu por meio de Ageu?','Considerai os vossos caminhos',['Abandonai Jerusalém','Escolhei um novo rei','Interrompei a reconstrução'],'Ageu convocou o povo a avaliar suas prioridades e sua negligência espiritual.','Profetas e Promessas','Prioridades espirituais','Média'),
q('Miquéias','Mq 6:8','O que o Senhor requer do homem?','Praticar justiça, amar misericórdia e andar humildemente com Deus',['Oferecer apenas sacrifícios caros','Conquistar as nações vizinhas','Isolar-se de todas as pessoas'],'Miquéias reúne justiça, misericórdia e humildade como resposta de vida diante de Deus.','Profetas e Promessas','Justiça e misericórdia','Média'),
q('Joel','Jl 2:13','O que o povo deveria rasgar ao voltar-se para o Senhor?','O coração, e não apenas as vestes',['As tendas do acampamento','Os livros da lei','As redes de pesca'],'Joel chama a um arrependimento interior, baseado na misericórdia de Deus.','Profetas e Promessas','Juízo e arrependimento','Média'),
q('Oseias','Os 6:6','O que Deus declarou desejar mais do que sacrifícios?','Misericórdia e conhecimento de Deus',['Poder político e expansão','Silêncio e isolamento','Riqueza e influência'],'Oseias destaca fidelidade relacional e conhecimento de Deus acima do ritual vazio.','Profetas e Promessas','Aliança e fidelidade','Média'),
q('Filemom','Fm 1:16','Que nova relação em Cristo Paulo destacou entre Filemom e Onésimo?','A de irmãos amados',['A de inimigos declarados','A de estrangeiros sem direitos','A de prisioneiro e condenador'],'Paulo apela para que a nova relação em Cristo transforme a recepção de Onésimo.','Igreja e Missão','Comunhão e reconciliação','Difícil'),
q('2 João','2Jo 1:6','Como 2 João define o amor?','Andar segundo os mandamentos de Deus',['Aceitar todo ensino sem exame','Evitar qualquer correção','Buscar somente experiências pessoais'],'A carta relaciona amor e obediência aos mandamentos.','Vida Cristã','Amor e obediência','Difícil'),
q('3 João','3Jo 1:4','Qual alegria João declarou ser a maior?','Ouvir que seus filhos andam na verdade',['Receber reconhecimento público','Viajar por muitas igrejas','Vencer debates teológicos'],'João celebra a perseverança de seus filhos espirituais na verdade.','Igreja e Missão','Verdade e testemunho','Difícil'),
q('Judas','Jd 1:3','Pelo que Judas exortou os irmãos a batalhar?','Pela fé entregue aos santos',['Por posições de liderança','Por tradições familiares','Por prosperidade material'],'Judas conclama a igreja a defender diligentemente a fé recebida.','Doutrina e Salvação','Fidelidade doutrinária','Difícil'),
q('2 Pedro','2Pe 1:5','O que Pedro manda acrescentar primeiro à fé?','A virtude',['A riqueza','A popularidade','A influência política'],'Pedro inicia uma sequência de crescimento espiritual começando pela virtude.','Vida Cristã','Maturidade espiritual','Difícil'),
q('Tito','Tt 2:11','O que a graça de Deus trouxe, segundo Tito?','Salvação a todos os homens',['Isenção de toda disciplina','Poder civil à igreja','Conhecimento sem transformação'],'Tito apresenta a graça salvadora como fundamento de uma vida sóbria e piedosa.','Doutrina e Salvação','Graça e salvação','Média'),
q('1 Tessalonicenses','1Ts 5:21','Como os cristãos devem lidar com aquilo que ouvem?','Examinar tudo e reter o bem',['Aceitar tudo imediatamente','Rejeitar todo ensino novo','Guardar apenas opiniões pessoais'],'Paulo une discernimento cuidadoso à retenção do que é bom.','Vida Cristã','Discernimento','Média'),
q('2 Tessalonicenses','2Ts 3:10','Que princípio Paulo recordou sobre trabalho e alimento?','Quem não quiser trabalhar também não deve comer',['Todo trabalho deve ser evitado','Somente líderes devem trabalhar','O alimento depende de posição social'],'A instrução confronta a ociosidade deliberada, não a incapacidade de trabalhar.','Vida Cristã','Trabalho e responsabilidade','Média'),
q('1 Timóteo','1Tm 4:12','Em quais áreas Timóteo deveria ser exemplo dos fiéis?','Palavra, trato, amor, espírito, fé e pureza',['Riqueza, poder e fama','Força, aparência e eloquência','Viagens, estudos e posição'],'Paulo orienta Timóteo a superar o desprezo pela juventude mediante um testemunho integral.','Igreja e Missão','Liderança e exemplo','Difícil'),
q('2 Timóteo','2Tm 3:16','Para que é proveitosa toda a Escritura inspirada por Deus?','Doutrina, repreensão, correção e instrução em justiça',['Entretenimento e curiosidade','Prestígio intelectual','Previsão de datas ocultas'],'Paulo apresenta a Escritura como suficiente para formar o servo de Deus.','Doutrina e Salvação','Palavra de Deus','Média'),
q('Hebreus','Hb 4:12','Como Hebreus descreve a palavra de Deus?','Viva, eficaz e mais penetrante que espada de dois gumes',['Antiga e sem aplicação','Restrita aos sacerdotes','Difícil e inacessível'],'A palavra discerne pensamentos e intenções do coração.','Doutrina e Salvação','Palavra de Deus','Média'),
q('Tiago','Tg 1:22','Que perigo Tiago aponta ao apenas ouvir a palavra?','Enganar a si mesmo',['Perder a capacidade de falar','Esquecer a língua materna','Ser excluído da sociedade'],'Tiago exige prática coerente, não mera audição.','Vida Cristã','Prática da Palavra','Fácil'),
q('1 Pedro','1Pe 3:15','Como o cristão deve responder sobre a razão de sua esperança?','Com mansidão e temor',['Com arrogância e desprezo','Somente por meio do silêncio','Com ameaças e imposição'],'Pedro une preparo apologético a uma postura respeitosa.','Igreja e Missão','Testemunho','Média'),
q('Romanos','Rm 12:2','Como ocorre a transformação mencionada por Paulo?','Pela renovação do entendimento',['Pela conformidade com o mundo','Pela mudança de nacionalidade','Pela ausência de decisões'],'A mente renovada permite experimentar a vontade de Deus.','Vida Cristã','Transformação','Média'),
q('1 Coríntios','1Co 10:13','Que provisão Deus dá juntamente com a tentação?','Um escape para que possa ser suportada',['A garantia de nunca ser tentado','A aprovação de qualquer escolha','O fim imediato de toda luta'],'Paulo afirma a fidelidade de Deus em limitar a prova e prover saída.','Vida Cristã','Perseverança','Média'),
q('2 Coríntios','2Co 12:9','Por que Paulo podia gloriar-se nas fraquezas?','Para que nele habitasse o poder de Cristo',['Para receber compaixão pública','Para evitar todo serviço','Para esconder seus erros'],'A graça suficiente de Cristo manifesta seu poder na fraqueza humana.','Doutrina e Salvação','Graça e poder','Média'),
q('Gálatas','Gl 5:13','Para que liberdade os irmãos foram chamados?','Para servir uns aos outros pelo amor',['Para satisfazer a carne','Para rejeitar toda responsabilidade','Para dominar os mais fracos'],'A liberdade cristã não é licença para a carne, mas oportunidade de serviço em amor.','Vida Cristã','Liberdade e serviço','Média'),
q('Efésios','Ef 4:29','Que tipo de palavra deve sair da boca do cristão?','A que edifica e comunica graça',['A que humilha o adversário','A que espalha suspeitas','A que busca somente elogios'],'Paulo substitui a comunicação corrupta por palavras úteis à edificação.','Vida Cristã','Comunicação','Média'),
q('Filipenses','Fp 2:4','Além dos próprios interesses, para o que cada um deve atentar?','Para os interesses dos outros',['Para aumentar sua reputação','Para evitar toda convivência','Para controlar decisões alheias'],'A humildade cristã considera de modo responsável o bem do próximo.','Vida Cristã','Humildade e serviço','Fácil'),
q('Colossenses','Cl 3:16','O que deve habitar abundantemente nos cristãos?','A palavra de Cristo',['O temor dos homens','A sabedoria deste mundo','A busca por reconhecimento'],'A palavra de Cristo sustenta ensino, admoestação e louvor comunitário.','Igreja e Missão','Palavra e comunhão','Média')]

# Remove exact prompt duplicates, keeping the first occurrence.
seen=set(); base=[]
for r in raw:
 k=norm(r['enunciado'])
 if k in seen: continue
 seen.add(k); r=dict(r);r['origem']='Base original reestruturada';base.append(r)
base.extend(new)
assert len(base)==1000, len(base)

OT={'gn','ex','lv','nm','dt','js','jud','rt','1sm','2sm','1kgs','2kgs','1ch','2ch','ezr','ne','et','job','ps','prv','ec','so','is','jr','lm','ez','dn','ho','jl','am','ob','jn','mi','na','hk','zp','hg','zc','ml'}
GOSPELS={'mt','mk','lk','jo'}; WISDOM={'job','ps','prv','ec','so'}; PROPHETS={'is','jr','lm','ez','dn','ho','jl','am','ob','jn','mi','na','hk','zp','hg','zc','ml'}
def taxonomy(r,bid):
 s=norm(r['tema']+' '+r['categoria']+' '+r['enunciado'])
 if bid in WISDOM:return ('Poesia e Sabedoria','Louvor e oração' if bid=='ps' else 'Sabedoria e vida')
 if bid in PROPHETS:return ('Profetas e Promessas','Juízo e arrependimento' if any(x in s for x in ['juizo','pecado','arrepend']) else 'Promessa e restauração')
 if bid in GOSPELS:
  if any(x in s for x in ['milagre','curou','cura','multiplic','ressuscit','agua em vinho']):return ('Milagres e Sinais','Curas e sinais')
  if any(x in s for x in ['parabola','ensin','mandamento','sermao','bem avent']):return ('Ensinos de Jesus','Parábolas e princípios')
  return ('Vida de Jesus','Ministério de Cristo')
 if bid=='act':return ('Igreja e Missão','Atos dos apóstolos')
 if bid=='re':return ('Escatologia','Apocalipse e nova criação')
 if bid in OT:
  if bid=='gn':return ('História e Origens','Criação e patriarcas')
  if bid in {'ex','js'}:return ('História e Origens','Êxodo e conquista')
  if bid in {'jud','rt','1sm','2sm','1kgs','2kgs','1ch','2ch'}:return ('História e Origens','Juízes e monarquia')
  if bid in {'ezr','ne','et'}:return ('História e Origens','Exílio e restauração')
  return ('Lei e Aliança','Mandamentos e culto')
 if any(x in s for x in ['salvacao','graca','fe','justific','cristo','pecado','evangelho']):return ('Doutrina e Salvação','Evangelho e fé')
 if any(x in s for x in ['igreja','missao','lider','discipul','testemun']):return ('Igreja e Missão','Comunhão e serviço')
 return ('Vida Cristã','Caráter e maturidade')

records=[]
acf_overrides={
 ('Gn 2:7','Do que Deus formou Adão?'):'Pó da terra',
 ('Êx 4:2','Qual objeto Deus usou no primeiro sinal dado a Moisés?'):'Uma vara',
 ('Mt 4:19','Qual convite Jesus fez a Pedro e André?'):'Vinde após mim',
 ('At 1:8','O que os discípulos receberiam antes de testemunhar?'):'A virtude do Espírito Santo',
 ('At 2:41','Cerca de quantas pessoas foram batizadas após a pregação de Pedro?'):'Quase três mil pessoas',
 ('Mc 4:39','Que ordem Jesus deu ao vento durante a tempestade?'):'Cala-te, aquieta-te',
 ('Hb 11:1','Como Hebreus define a fé?'):'Firme fundamento e prova',
 ('Rm 12:2','O cristão deve ser transformado por meio da renovação de quê?'):'Entendimento',
 ('1Rs 19:12','Como Elias percebeu a presença de Deus no Horebe?'):'Em uma voz mansa e delicada',
 ('Jz 7:7','Com quantos homens Gideão derrotou os midianitas?'):'Trezentos homens',
}
for idx,r in enumerate(base):
 text,err=get_ref(r['referencia'],r['livro']); assert not err,(idx,r['referencia'],err)
 m=re.match(r'\s*([1-3]?\s*[A-Za-zÀ-ÿ]+)',r['referencia']); ab=norm(m.group(1)).replace(' ','');bid=name_override.get(ab,{}).get(r['livro']) or book_alias[ab]
 theme,cat=taxonomy(r,bid)
 choices=[r[f'alternativa_{x}'].strip() for x in 'abcd']; ci='ABCD'.index(r['correta'].strip().upper()); correct=choices[ci]
 override=acf_overrides.get((r['referencia'],r['enunciado']))
 if override: choices[ci]=correct=override
 # Stable quality score: common facts are easier; long/precise recall and rare books are harder.
 score=1
 if len(correct.split())>7 or any(x in norm(r['enunciado']) for x in ['segundo','quantos','qual profeta','significa','complet']):score+=1
 if bid in {'ob','na','hk','zp','hg','2jo','3jo','jd','phm'}:score+=1
 if r['dificuldade']=='Difícil':score+=1
 records.append({**r,'livro':by_id[bid]['name'],'tema':theme,'categoria':cat,'acf_texto':text,'validacao':'Referência ACF confirmada','score':score,'correct':correct,'choices':choices,'ci':ci})

# Exact target: 350 easy, 400 medium, 250 hard, using score and stable tie-breakers.
order=sorted(range(1000),key=lambda i:(records[i]['score'],len(records[i]['enunciado']),i))
levels={i:('Fácil' if rank<350 else 'Média' if rank<750 else 'Difícil') for rank,i in enumerate(order)}
for i,r in enumerate(records):
 # 250 correct positions each; swap only, never alter correctness.
 target=i%4; ch=r['choices'][:]; ch[r['ci']],ch[target]=ch[target],ch[r['ci']]
 r['dificuldade']=levels[i]; r['choices']=ch; r['correta']='ABCD'[target]
 r['comentario']=re.sub(r'\s+',' ',r['comentario']).strip()
 r['id']=f'ACF-{i+1:04d}'

prompts=[norm(r['enunciado']) for r in records]
if len(set(prompts))!=1000:
 c=collections.Counter(prompts); print('DUPLICATE_PROMPTS',[(p,n) for p,n in c.items() if n>1]); raise AssertionError('prompts duplicados')
assert collections.Counter(r['correta'] for r in records)=={'A':250,'B':250,'C':250,'D':250}
assert collections.Counter(r['dificuldade'] for r in records)=={'Fácil':350,'Média':400,'Difícil':250}
out={'meta':{'total':1000,'translation':'Almeida Corrigida e Revisada Fiel (ACF)','source':'https://raw.githubusercontent.com/MaatheusGois/bible/main/versions/pt-br/acf.json','answer_distribution':dict(collections.Counter(r['correta'] for r in records)),'difficulty_distribution':dict(collections.Counter(r['dificuldade'] for r in records)),'theme_distribution':dict(collections.Counter(r['tema'] for r in records)),'category_distribution':dict(collections.Counter(r['categoria'] for r in records)),'new_questions':32},'rows':records}
open(ROOT/'quiz_acf_reestruturado.json','w',encoding='utf8').write(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps(out['meta'],ensure_ascii=False,indent=2))
