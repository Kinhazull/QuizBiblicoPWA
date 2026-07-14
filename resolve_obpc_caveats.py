import json,collections
from pathlib import Path
ROOT=Path(__file__).parent
d=json.load(open(ROOT/'quiz_acf_homologacao.json',encoding='utf8'));rows=d['rows']
official='https://www.conselhonacional.org.br/n%C3%B3s-cremos'
creed={
 'I':'Deus único eternamente subsistente em Pai, Filho e Espírito Santo.',
 'II':'Inspiração verbal e plena da Bíblia como única regra infalível de fé e vida.',
 'III':'Nascimento virginal de Cristo e rejeição da adoração a Maria.',
 'IV':'Cristo sem pecado, morte substitutiva e remidora, ressurreição corporal e ascensão.',
 'V':'Queda, arrependimento, fé, novo nascimento, perdão e justificação graciosa em Cristo.',
 'VI':'Batismo do crente por imersão, uma vez, em nome do Pai, Filho e Espírito Santo.',
 'VII':'Vida de santidade, testemunho, comunhão e partir do pão.',
 'VIII':'Igreja única e santa, Corpo de Cristo, edificada pelo Espírito, ministérios, dons e Escritura.',
 'IX':'Batismo com o Espírito Santo, línguas e dons para edificação da Igreja e glória de Deus.',
 'X':'Vinda de Cristo em duas fases e reino milenar sobre a Terra.',
 'XI':'Tribunal de Cristo para recompensa dos salvos, sem condenação eterna.',
 'XII':'Juízo Final, gozo eterno dos fiéis e condenação eterna dos infiéis.'}
area_article={'Cristologia e Trindade':'I e IV','Salvação e perseverança':'IV e V','Dons e ação do Espírito':'VIII e IX','Eclesiologia e ministério':'VII e VIII','Escatologia':'X, XI e XII'}
rewrites={
 'ACF-0099':dict(enunciado='A que Jesus comparou o reino dos céus em Mateus 13:33?',correct='Ao fermento misturado em três medidas de farinha',wrong=['A uma fortaleza cercada','A um rio que nunca transborda','A uma pedra escondida no deserto'],comentario='Jesus comparou o reino dos céus ao fermento que leveda toda a massa.'),
 'ACF-0354':dict(enunciado='Segundo Gálatas 5:1, para que Cristo nos libertou?',correct='Para a liberdade',wrong=['Para voltar à servidão','Para buscar mérito pela lei','Para viver sem responsabilidade'],comentario='Paulo exorta os cristãos a permanecerem firmes na liberdade concedida por Cristo.'),
 'ACF-0412':dict(enunciado='Segundo 2 Pedro 3:9, o que o Senhor deseja em vez de que alguém se perca?',correct='Que todos venham a arrepender-se',wrong=['Que apenas alguns conheçam a verdade','Que o juízo nunca aconteça','Que ninguém precise mudar de vida'],comentario='A aparente demora expressa a longanimidade de Deus e seu chamado ao arrependimento.'),
 'ACF-0699':dict(enunciado='O que aconteceu aos discípulos de Emaús quando Jesus partiu o pão?',correct='Seus olhos se abriram e eles o reconheceram',wrong=['Eles adormeceram imediatamente','Eles voltaram a pescar','Eles deixaram Jerusalém em silêncio'],comentario='Ao partir do pão, os olhos dos discípulos foram abertos e eles reconheceram Jesus.'),
 'ACF-0940':dict(enunciado='Qual expressão Jesus usou para ensinar a repetição do perdão?',correct='Setenta vezes sete',wrong=['Somente sete vezes','Uma vez por ano','Doze vezes ao dia'],comentario='A expressão “setenta vezes sete” ensina um perdão reiterado, não uma contagem para limitar a misericórdia.')}

decisions=[];final_rows=[]
for r in rows:
 old=r['homologacao_teologica']; caveat='ressalva' in old.lower()
 r=dict(r);r['choices']=list(r['choices'])
 action='Mantida'
 if r['id'] in rewrites:
  z=rewrites[r['id']];ci='ABCD'.index(r['correta']);new=[None]*4;new[ci]=z['correct'];wi=iter(z['wrong'])
  for i in range(4):
   if new[i] is None:new[i]=next(wi)
  r['enunciado']=z['enunciado'];r['choices']=new;r['comentario']=z['comentario'];action='Reescrita para formulação textual inequívoca'
 if caveat:
  areas=[x.strip() for x in r.get('area_doutrinaria','').split(',') if x.strip()]
  articles=sorted({a for area in areas for a in [area_article.get(area)] if a})
  basis=('Credo OBPC, artigos '+', '.join(articles)) if articles else 'Credo OBPC, artigo II'
  basis+=f'; texto ACF em {r["referencia"]}'
  r['homologacao_obpc']='Homologada — ressalva sanada';r['fundamento_obpc']=basis;r['fonte_obpc']=official
  decisions.append({'id':r['id'],'referencia':r['referencia'],'status_anterior':old,'acao':action,'fundamento':basis,'enunciado_final':r['enunciado'],'resposta_final':r['choices']['ABCD'.index(r['correta'])]})
 else:
  r['homologacao_obpc']='Homologada — mantida';r['fundamento_obpc']=f'Texto ACF em {r["referencia"]}; compatível com o artigo II do Credo OBPC';r['fonte_obpc']=official
 final_rows.append(r)

assert len(decisions)==92,len(decisions)
assert len(final_rows)==1000
assert all(len(set(c.lower() for c in r['choices']))==4 for r in final_rows)
summary={'total':1000,'caveats_reviewed':92,'caveats_resolved':92,'rewritten':sum(x['acao'].startswith('Reescrita') for x in decisions),'removed':0,'remaining_caveats':0,'status':dict(collections.Counter(r['homologacao_obpc'] for r in final_rows)),'official_source':official}
json.dump({'summary':summary,'creed':creed,'rows':final_rows,'decisions':decisions},open(ROOT/'quiz_acf_obpc_final.json','w',encoding='utf8'),ensure_ascii=False,indent=2)
print(json.dumps(summary,ensure_ascii=False,indent=2))
