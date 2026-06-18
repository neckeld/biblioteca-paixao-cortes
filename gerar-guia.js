/**
 * Gera o Guia do Usuário da Biblioteca Paixão Côrtes em formato .docx
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TableOfContents, VerticalAlign,
} = require('docx');

// ── Paleta ──────────────────────────────────────────────────────────────────
const AZUL = '1E40AF';
const AZUL_CLARO = 'D5E8F0';
const CINZA = '6B7280';
const VERDE = '15803D';
const VERMELHO = 'B91C1C';
const AMARELO_BG = 'FEF3C7';

// ── Helpers ─────────────────────────────────────────────────────────────────
const CONTENT_WIDTH = 9360; // US Letter, margens 1"

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: [new TextRun({ text, ...opts })],
  });
}
function rich(runs, opts = {}) {
  return new Paragraph({ spacing: { after: 120, line: 276 }, children: runs, ...opts });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { after: 60, line: 276 },
    children: typeof text === 'string' ? [new TextRun(text)] : text,
  });
}
function num(text) {
  return new Paragraph({
    numbering: { reference: 'steps', level: 0 },
    spacing: { after: 80, line: 276 },
    children: typeof text === 'string' ? [new TextRun(text)] : text,
  });
}

// Caixa de destaque (dica/aviso) como parágrafo com borda
function callout(label, text, color) {
  return new Paragraph({
    spacing: { before: 80, after: 160, line: 276 },
    shading: { type: ShadingType.CLEAR, fill: color === VERMELHO ? 'FDE8E8' : (color === VERDE ? 'E7F6EC' : AMARELO_BG) },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color, space: 8 },
      top: { style: BorderStyle.SINGLE, size: 2, color: 'FFFFFF', space: 6 },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'FFFFFF', space: 6 },
    },
    children: [
      new TextRun({ text: label + '  ', bold: true, color }),
      new TextRun({ text }),
    ],
  });
}

// Célula de tabela
function cell(text, { header = false, width, bold = false } = {}) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: { top: border, bottom: border, left: border, right: border },
    shading: header ? { fill: AZUL_CLARO, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: header || bold, color: header ? AZUL : undefined })],
    })],
  });
}

function table2col(rows, w1, w2) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [w1, w2],
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: [cell(r[0], { header: i === 0, width: w1, bold: i > 0 }), cell(r[1], { header: i === 0, width: w2 })],
    })),
  });
}

function table3col(rows, w1, w2, w3) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [w1, w2, w3],
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: [
        cell(r[0], { header: i === 0, width: w1, bold: i > 0 }),
        cell(r[1], { header: i === 0, width: w2 }),
        cell(r[2], { header: i === 0, width: w3 }),
      ],
    })),
  });
}

function spacer() { return new Paragraph({ spacing: { after: 60 }, children: [new TextRun('')] }); }

// ── Documento ───────────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'Biblioteca Paixão Côrtes',
  title: 'Guia do Usuário — Sistema da Biblioteca',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: 'Arial', color: AZUL },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AZUL, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, font: 'Arial', color: '1F2937' },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 620, hanging: 320 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1100, hanging: 320 } } } },
        ] },
      { reference: 'steps',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 620, hanging: 320 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'Biblioteca Paixão Côrtes — Guia do Usuário', size: 16, color: CINZA })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Página ', size: 16, color: CINZA }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: CINZA }),
          new TextRun({ text: ' de ', size: 16, color: CINZA }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: CINZA }),
        ],
      })] }),
    },
    children: [
      // ── CAPA ──────────────────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 1200, after: 0 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '📚', size: 96 })] }),
      new Paragraph({ spacing: { before: 240, after: 80 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Sistema de Gestão da Biblioteca', bold: true, size: 48, color: AZUL })] }),
      new Paragraph({ spacing: { after: 80 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'EMEF João Carlos D’Ávila Paixão Côrtes', size: 28, color: '1F2937' })] }),
      new Paragraph({ spacing: { before: 400, after: 0 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Guia do Usuário', bold: true, size: 36, color: CINZA })] }),
      new Paragraph({ spacing: { before: 1600, after: 0 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Manual prático de uso diário do sistema', italics: true, size: 22, color: CINZA })] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ── SUMÁRIO ─────────────────────────────────────────────────────────────
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Sumário')] }),
      new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-2' }),

      new Paragraph({ children: [new PageBreak()] }),

      // ── 1. INTRODUÇÃO ───────────────────────────────────────────────────────
      h1('1. Introdução'),
      p('Este sistema foi criado para organizar a biblioteca da escola de forma simples e gratuita. Todas as informações ficam guardadas em planilhas do Google (Acervo e Empréstimos), e o sistema é apenas uma forma mais fácil e bonita de consultar e atualizar esses dados.'),
      p('Com ele você pode:'),
      bullet('Consultar e cadastrar livros do acervo;'),
      bullet('Registrar empréstimos e devoluções de livros;'),
      bullet('Cadastrar e organizar os alunos por turma;'),
      bullet('Acompanhar livros atrasados e gerar relatórios.'),
      callout('💡 Dica', 'Você não precisa entender de computador para usar. Basta seguir este guia passo a passo. Em caso de dúvida, nada que você fizer no sistema apaga dados importantes sem confirmação.', AMARELO_BG),

      // ── 2. PRIMEIROS PASSOS ─────────────────────────────────────────────────
      h1('2. Como abrir o sistema'),
      p('O sistema funciona no computador da biblioteca, dentro do navegador (Google Chrome).'),
      num('Dê dois cliques no ícone Iniciar Biblioteca (arquivo "iniciar") na área de trabalho.'),
      num('Aguarde alguns segundos. Uma tela preta pode aparecer — isso é normal, não feche.'),
      num('O navegador abre automaticamente no endereço do sistema.'),
      num('Pronto! A tela inicial (Painel) será exibida.'),
      callout('⚠️ Importante', 'Na primeira vez que usar, o sistema pode pedir para entrar com a conta do Google da biblioteca e clicar em "Permitir". Isso acontece só uma vez.', VERMELHO),
      spacer(),
      p('No alto da tela existe um menu com as cinco áreas do sistema:'),
      table2col([
        ['Área', 'Para que serve'],
        ['Painel', 'Visão geral com números e gráficos da biblioteca.'],
        ['Acervo', 'Lista de todos os livros. Cadastrar e editar livros.'],
        ['Empréstimos', 'Registrar quando um aluno pega ou devolve um livro.'],
        ['Alunos', 'Cadastrar e organizar os alunos por turma.'],
        ['Relatórios', 'Ver atrasados, fazer buscas e exportar listas.'],
      ], 2400, 6960),
      callout('🌙 Modo claro/escuro', 'No canto da tela há um botão para alternar entre fundo claro e escuro, conforme sua preferência ou a iluminação da sala.', AMARELO_BG),

      // ── 3. PAINEL ───────────────────────────────────────────────────────────
      h1('3. Painel (tela inicial)'),
      p('O Painel mostra um resumo rápido da biblioteca. Logo no topo aparecem os números principais:'),
      bullet('Total de livros no acervo;'),
      bullet('Total de empréstimos já realizados;'),
      bullet('Empréstimos ativos (livros que estão com os alunos agora);'),
      bullet('Empréstimos atrasados (passaram da data de devolução);'),
      bullet('Empréstimos já devolvidos.'),
      p('Abaixo dos números há gráficos coloridos, como os livros mais emprestados e a quantidade de empréstimos por turma. Eles servem apenas para consulta — não é preciso clicar em nada.'),
      callout('💡 Dica', 'Use o Painel todos os dias para ver rapidamente quantos livros estão atrasados e precisam de atenção.', AMARELO_BG),

      // ── 4. ACERVO ───────────────────────────────────────────────────────────
      h1('4. Acervo (livros)'),
      p('Nesta área ficam todos os livros da biblioteca. Cada livro tem um número único chamado Nº de Tombo.'),

      h2('4.1 Procurar um livro'),
      num('Clique em Acervo no menu.'),
      num('Na caixa de busca, digite o título, o autor, o assunto, a coleção ou o número de tombo.'),
      num('A lista vai sendo filtrada automaticamente enquanto você digita.'),
      num('Clique sobre a linha de um livro para ver todos os detalhes dele.'),

      h2('4.2 Cadastrar um livro novo'),
      num('Clique no botão Novo Livro (no canto superior direito).'),
      num('O campo Nº Tombo já vem preenchido automaticamente com o próximo número disponível.'),
      num('Preencha os campos. Os marcados com asterisco vermelho (*) são obrigatórios: Autor e Título.'),
      num('Confira a Cor da Etiqueta, a Coleção e a Classe/Gênero, se houver.'),
      num('Clique em Cadastrar livro. Pronto! Ele já aparece na lista.'),
      callout('💡 Dica', 'A data de registro do livro é preenchida sozinha com a data de hoje. Você não precisa digitá-la.', AMARELO_BG),

      h2('4.3 Editar um livro'),
      num('Encontre o livro na lista.'),
      num('Clique no ícone de lápis (✏️) na linha do livro.'),
      num('Altere o que precisar e clique em Salvar alterações.'),
      spacer(),
      p('No formulário de edição existe o campo Baixa do Acervo:'),
      table2col([
        ['Baixa', 'Significado'],
        ['Não', 'O livro está ativo, disponível na biblioteca (opção padrão).'],
        ['Sim', 'O livro foi retirado do acervo (perdido, danificado, descartado).'],
      ], 2400, 6960),
      callout('✅ Observação', 'Ao cadastrar um livro novo, a Baixa é sempre "Não" — ou seja, o livro entra ativo no acervo.', VERDE),

      // ── 5. ALUNOS ───────────────────────────────────────────────────────────
      h1('5. Alunos'),
      p('Aqui você organiza os alunos separados por turma. As turmas aparecem como abas (botões) no alto da tela: Jardim A, Jardim B, 1º Ano, 2º Ano, e assim por diante, incluindo Professores e Funcionários.'),

      h2('5.1 Ver os alunos de uma turma'),
      num('Clique em Alunos no menu.'),
      num('Clique na aba da turma desejada (ex.: "2º Ano").'),
      num('A lista mostra cada aluno com o total de empréstimos, quantos estão ativos e quantos atrasados.'),
      num('Para procurar um aluno específico, digite o nome na caixa de busca.'),

      h2('5.2 Ver o histórico de um aluno'),
      num('Na lista de alunos, clique na seta (▼) ao lado do nome.'),
      num('Aparecem todos os livros que aquele aluno já pegou, com datas e situação (devolvido, ativo ou atrasado).'),

      h2('5.3 Cadastrar um aluno novo'),
      num('Escolha primeiro a aba da turma correta.'),
      num('Clique no botão Novo Aluno.'),
      num('Digite o nome completo do aluno.'),
      num('Clique em Cadastrar. O nome é salvo automaticamente em letras maiúsculas.'),

      h2('5.4 Editar ou remover um aluno'),
      bullet([new TextRun({ text: 'Editar: ', bold: true }), new TextRun('clique no ícone de lápis (✏️), corrija o nome e salve.')]),
      bullet([new TextRun({ text: 'Remover: ', bold: true }), new TextRun('clique no ícone de lixeira (🗑️) e confirme.')]),
      callout('✅ Fique tranquilo', 'Remover um aluno da lista da turma NÃO apaga o histórico de empréstimos dele. Os registros antigos continuam guardados.', VERDE),

      // ── 6. EMPRÉSTIMOS ──────────────────────────────────────────────────────
      h1('6. Empréstimos'),
      p('Esta é a área mais usada no dia a dia: registrar quando um aluno pega um livro e quando o devolve.'),

      h2('6.1 Registrar um empréstimo (aluno pegou um livro)'),
      num('Clique em Empréstimos no menu.'),
      num('Clique no botão Novo Empréstimo.'),
      num('Escolha a Turma do aluno.'),
      num('Escolha o Aluno na lista que aparece.'),
      num('Digite o Nº de Tombo do livro. O sistema mostra o título para você conferir.'),
      num('Clique em Registrar Empréstimo.'),
      spacer(),
      p('O prazo de devolução é de 7 dias, calculado automaticamente a partir da data de hoje.'),
      callout('⚠️ Atenção', 'Cada aluno só pode ter um livro emprestado por vez. Se o aluno já estiver com um livro, o sistema avisa e não deixa registrar outro antes da devolução.', VERMELHO),
      callout('✅ Professores e funcionários', 'A turma "Professores e Funcionários" não tem esse limite: eles podem retirar vários livros ao mesmo tempo, sem precisar devolver antes.', VERDE),

      h2('6.2 Registrar uma devolução (aluno devolveu o livro)'),
      num('Clique em Empréstimos no menu.'),
      num('Encontre o empréstimo na lista (use a busca pelo nome do aluno ou número do livro, se precisar).'),
      num('Clique em Devolver na linha do empréstimo.'),
      num('Confira os dados na janela e clique em Confirmar Devolução.'),
      p('O sistema marca a data de devolução e indica se houve atraso. O livro fica livre para um novo empréstimo.'),

      h2('6.3 Renovar um empréstimo (dar mais prazo)'),
      p('Se o aluno ainda não terminou de ler, você pode dar mais uma semana de prazo sem precisar devolver e emprestar o livro de novo.'),
      num('Clique em Empréstimos no menu.'),
      num('Encontre o empréstimo na lista.'),
      num('Clique em Renovar na linha do empréstimo.'),
      p('A data de devolução é adiada em mais 7 dias. Se o livro já estava atrasado, o novo prazo passa a contar a partir de hoje.'),
      callout('💡 Dica', 'Você pode renovar quantas vezes precisar — basta clicar em Renovar novamente quando o prazo estiver perto de acabar.', AMARELO_BG),

      h2('6.4 Filtrar a lista de empréstimos'),
      p('Acima da lista há filtros que ajudam a encontrar o que você procura:'),
      table2col([
        ['Filtro', 'O que faz'],
        ['Busca', 'Procura por nome do aluno ou número do livro.'],
        ['Status', 'Mostra só ativos, só atrasados ou só devolvidos.'],
        ['Turma', 'Mostra apenas os empréstimos de uma turma.'],
      ], 2400, 6960),

      // ── 7. MODO OFFLINE ─────────────────────────────────────────────────────
      h1('7. Trabalhar sem internet (modo offline)'),
      p('Quando a internet da escola cai, o sistema continua funcionando normalmente. Você pode consultar, emprestar, devolver, renovar e cadastrar como sempre — nada para de funcionar.'),
      p('Nesses momentos aparece uma faixa amarela no alto da tela, escrito "Modo offline".'),
      callout('⚠️ Importante', 'Tudo o que você fizer sem internet fica guardado no próprio computador e é enviado sozinho para as planilhas do Google assim que a internet voltar. Você não precisa fazer nada: a sincronização é automática.', VERMELHO),

      h2('7.1 Como saber a situação da conexão'),
      p('A faixa colorida no topo avisa o que está acontecendo:'),
      table2col([
        ['Faixa', 'O que significa'],
        ['Sem faixa', 'Tudo normal, conectado à internet.'],
        ['Amarela ("Modo offline")', 'Sem internet. Pode continuar trabalhando; as ações ficam guardadas e mostram quantas estão pendentes.'],
        ['Azul ("Sincronizando...")', 'A internet voltou e o sistema está enviando o que ficou pendente. Some sozinha ao terminar.'],
      ], 3400, 5960),

      h2('7.2 Cuidados no modo offline'),
      bullet('Para funcionar offline, o sistema precisa ter sido aberto com internet pelo menos uma vez (para guardar uma cópia dos dados no computador).'),
      bullet('Evite registrar o empréstimo E a devolução do mesmo livro no mesmo dia enquanto estiver sem internet.'),
      bullet('Não apague nem mude de lugar as linhas das planilhas do Google (pelo celular ou outro computador) enquanto o sistema estiver offline com ações pendentes.'),
      callout('✅ Fique tranquilo', 'Mesmo que você feche o sistema antes de a internet voltar, nada se perde: as ações ficam guardadas e são enviadas automaticamente na próxima vez que o sistema for aberto com internet.', VERDE),

      // ── 8. RELATÓRIOS ───────────────────────────────────────────────────────
      h1('8. Relatórios'),
      p('Esta área reúne consultas úteis e permite salvar listas no computador.'),

      h2('8.1 Empréstimos atrasados'),
      p('Logo ao abrir, o sistema mostra todos os livros que passaram da data de devolução, do mais atrasado para o menos atrasado. Use esta lista para cobrar a devolução dos alunos.'),

      h2('8.2 Histórico com filtros'),
      num('Escolha os filtros desejados (turma, nome do aluno, número do livro ou status).'),
      num('Clique em Buscar.'),
      num('A lista de resultados aparece logo abaixo.'),

      h2('8.3 Exportar (salvar a lista)'),
      p('Tanto na lista de atrasados quanto no histórico, há dois botões para salvar os dados:'),
      table2col([
        ['Botão', 'Para que serve'],
        ['CSV', 'Gera uma planilha que pode ser aberta no Excel ou Google Sheets.'],
        ['PDF', 'Gera um documento pronto para imprimir.'],
      ], 2400, 6960),
      callout('💡 Dica', 'Use o PDF para imprimir a lista de atrasados e entregar aos professores. Use o CSV se quiser fazer suas próprias contas em uma planilha.', AMARELO_BG),

      // ── 9. PERGUNTAS FREQUENTES ─────────────────────────────────────────────
      h1('9. Perguntas frequentes'),
      table2col([
        ['Pergunta', 'Resposta'],
        ['O sistema não abriu / deu erro ao carregar.', 'Feche tudo e abra novamente pelo ícone "iniciar". Se persistir, reinicie o computador e tente de novo.'],
        ['Apareceu uma faixa amarela "Modo offline".', 'A internet caiu. Pode continuar trabalhando normalmente; tudo será enviado sozinho quando a internet voltar.'],
        ['Não consigo emprestar um livro para o aluno.', 'Verifique se ele já não está com outro livro. Cada aluno só pode ter um por vez (exceto professores e funcionários, que não têm limite).'],
        ['Um professor precisa pegar vários livros.', 'Sem problema: a turma "Professores e Funcionários" não tem limite de empréstimos.'],
        ['O nome do aluno não aparece na lista.', 'Cadastre-o primeiro na área Alunos, na aba da turma correta.'],
        ['O livro não foi encontrado pelo número.', 'Confira o Nº de Tombo. Se for um livro novo, cadastre-o antes em Acervo.'],
        ['Apaguei algo sem querer.', 'Os dados ficam nas planilhas do Google. Procure o responsável pela escola para recuperar pelo histórico do Google.'],
      ], 3400, 5960),

      h1('10. Resumo rápido do dia a dia'),
      p('As três tarefas mais comuns, em poucos passos:'),
      spacer(),
      rich([new TextRun({ text: 'Aluno pegou um livro: ', bold: true, color: AZUL }),
            new TextRun('Empréstimos → Novo Empréstimo → escolher turma, aluno e número do livro → Registrar.')]),
      rich([new TextRun({ text: 'Aluno devolveu um livro: ', bold: true, color: AZUL }),
            new TextRun('Empréstimos → achar na lista → Devolver → Confirmar.')]),
      rich([new TextRun({ text: 'Aluno quer mais prazo: ', bold: true, color: AZUL }),
            new TextRun('Empréstimos → achar na lista → Renovar (adia mais 7 dias).')]),
      rich([new TextRun({ text: 'Chegou um livro novo: ', bold: true, color: AZUL }),
            new TextRun('Acervo → Novo Livro → preencher autor e título → Cadastrar.')]),
      rich([new TextRun({ text: 'Sem internet: ', bold: true, color: AZUL }),
            new TextRun('continue normalmente — tudo é enviado sozinho quando a conexão voltar.')]),
      spacer(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
        children: [new TextRun({ text: 'Boa leitura e bom trabalho! 📚', italics: true, size: 24, color: CINZA })] }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('Guia_do_Usuario_Biblioteca.docx', buffer);
  console.log('✅ Guia gerado: Guia_do_Usuario_Biblioteca.docx');
});
