export function suggestOccurrence(text: string) {
  const content = text.toLocaleLowerCase("pt-BR");
  if (/vazamento|elétrica|estrutura|porta|infiltração|goteira|faísca|queimad|curto|tomada/.test(content)) {
    return { priority: "Alta", team: "Manutenção predial", deadline: "Até 24 horas", similar: "Vazamento próximo ao Lab Maker · OC-0247" };
  }
  if (/projetor|computador|wi-?fi|internet|cabo|impressora|tela/.test(content)) {
    return { priority: "Média", team: "Tecnologia e audiovisual", deadline: "Até 2 dias úteis", similar: "Projetor do auditório sem sinal · OC-0248" };
  }
  if (/limpeza|lixo|higien|papel|sabão/.test(content)) {
    return { priority: "Baixa", team: "Equipe de limpeza", deadline: "Até 1 dia útil", similar: "Reposição de material de limpeza · OC-0246" };
  }
  return { priority: "Média", team: "Equipe de operações", deadline: "Até 3 dias úteis", similar: "Nenhuma ocorrência semelhante encontrada" };
}
