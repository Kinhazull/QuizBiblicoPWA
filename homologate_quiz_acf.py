import json,re,unicodedata,collections,math
from pathlib import Path
ROOT=Path(__file__).parent
data=json.load(open(ROOT/'quiz_acf_reestruturado.json',encoding='utf8')); rows=data['rows']
def norm(s):
 s=unicodedata.normalize('NFD',str(s).lower());s=''.join(c for c in s if unicodedata.category(c)!='Mn');return re.sub(r'[^a-z0-9]+',' ',s).strip()
stop={'que','qual','quem','como','para','por','dos','das','uma','com','sem','seu','sua','foi','era','sobre','segundo','deus','senhor','jesus'}
def tok(s):return {w for w in norm(s).split() if len(w)>2 and w not in stop}
def jac(a,b):
 a,b=tok(a),tok(b);return len(a&b)/max(1,len(a|b))

doctrinal={
 'Cristologia e Trindade':['trindade','divindade','filho de deus','verbo','espirito santo','deus forte','alfa e omega'],
 'Salvação e perseverança':['predestin','eleit','justific','salvacao','perder a salvacao','apostasia','obras da lei','novo nascimento'],
 'Dons e ação do Espírito':['dons espirituais','linguas','profecia','batismo com o espirito','cessar'],
 'Eclesiologia e ministério':['bispo','presbiter','pastor','mulher','ministerio','ceia','batismo'],
 'Escatologia':['arrebat','milênio','tribulacao','anticristo','segunda vinda','apocalipse','marca da besta','nova jerusalem'],
}
direct_words=['quem','quantos','onde','qual','quais','o que','como','em qual','por quantos','ate quando','de que','a quem','segundo']
aud=[]
for r in rows:
 if r['id']=='ACF-0462':
  r=dict(r);r['choices']=[('Cem gerações' if c=='Mil' else c) for c in r['choices']]
 ci='ABCD'.index(r['correta']);correct=r['choices'][ci];wrong=[c for i,c in enumerate(r['choices']) if i!=ci]
 clen=len(correct);wavg=sum(map(len,wrong))/3;len_ratio=min(clen,wavg)/max(1,max(clen,wavg))
 sims=[jac(correct,w) for w in wrong];maxsim=max(sims);same_type=sum((any(ch.isdigit() for ch in w)==any(ch.isdigit() for ch in correct)) for w in wrong)/3
 issues=[];power=3
 if len_ratio<.48:issues.append('Pista de tamanho: resposta correta destoa das demais');power-=1
 short_parallel=len(correct.split())<=3 and all(len(w.split())<=3 for w in wrong)
 if maxsim<.05 and len(tok(correct))>1 and not short_parallel:issues.append('Distratores pouco próximos do campo semântico da resposta');power-=1
 if same_type<.67:issues.append('Distratores não mantêm o mesmo tipo de resposta');power-=1
 if any(x in norm(r['enunciado']) for x in ['nao aparece','exceto','incorreta','nao identifica']):issues.append('Enunciado negativo requer leitura adicional')
 power=max(1,min(3,power))
 base={'Fácil':1,'Média':2,'Difícil':3}[r['dificuldade']]
 # Difficulty is knowledge demand adjusted by how much the alternatives help.
 effective=base
 if power==1 and base>1:effective-=1
 if power==3 and base==1 and len(correct.split())>=7:effective=2
 suggested={1:'Fácil',2:'Média',3:'Difícil'}[effective]
 adequacy='Adequada' if suggested==r['dificuldade'] and power>=2 else ('Aceitável com ajuste' if suggested==r['dificuldade'] else 'Recalibrar')
 if power==1:rec='Reescrever ao menos dois distratores com o mesmo tipo, extensão e contexto da resposta correta.'
 elif suggested!=r['dificuldade']:rec=f'Alterar dificuldade para {suggested} considerando as alternativas atuais.'
 else:rec='Manter dificuldade e alternativas.'
 text=norm(r['tema']+' '+r['categoria']+' '+r['enunciado']+' '+r['comentario'])
 areas=[name for name,keys in doctrinal.items() if any(k in text for k in keys)]
 direct=any(norm(r['enunciado']).startswith(x) for x in direct_words) or r['origem']=='Nova ACF'
 if areas and not direct:
  theo='Homologada com ressalva doutrinária';theo_note='Conferir a formulação conforme a declaração de fé da comunidade: '+', '.join(areas)
 elif any(x in norm(r['enunciado']) for x in ['por que','significa','representa','simboliza']) and not direct:
  theo='Homologada com ressalva interpretativa';theo_note='A resposta envolve síntese/interpretação; manter o comentário limitado ao que a passagem sustenta.'
 else:
  theo='Homologada — 1ª etapa';theo_note='Conteúdo factual ou textual compatível com a referência ACF.'
 if 'sobreposicao' in norm(' '.join(issues)):theo='Reter para revisão editorial';theo_note='Resolver a ambiguidade entre alternativas antes da publicação.'
 aud.append({**r,'poder_distratores':power,'adequacao_dificuldade':adequacy,'dificuldade_sugerida':suggested,'alertas_alternativas':' | '.join(issues) or 'Sem alerta estrutural','recomendacao_alternativas':rec,'homologacao_teologica':theo,'area_doutrinaria':', '.join(areas),'nota_teologica':theo_note})

summary={
 'total':len(aud),'difficulty_original':dict(collections.Counter(r['dificuldade'] for r in aud)),'difficulty_suggested':dict(collections.Counter(r['dificuldade_sugerida'] for r in aud)),
 'difficulty_adequacy':dict(collections.Counter(r['adequacao_dificuldade'] for r in aud)),'distractor_power':dict(collections.Counter(str(r['poder_distratores']) for r in aud)),
 'theology':dict(collections.Counter(r['homologacao_teologica'] for r in aud)),'length_clues':sum('Pista de tamanho' in r['alertas_alternativas'] for r in aud),
 'semantic_weak':sum('campo semântico' in r['alertas_alternativas'] for r in aud),'type_mismatch':sum('mesmo tipo' in r['alertas_alternativas'] for r in aud)
}
open(ROOT/'quiz_acf_homologacao.json','w',encoding='utf8').write(json.dumps({'summary':summary,'rows':aud},ensure_ascii=False,indent=2))
print(json.dumps(summary,ensure_ascii=False,indent=2))
