# ERROS MEMORÁVEIS — RPG Admin Project

## Erros Técnicos

### 1. player.html — CSS corrompido por deslocamento de bloco
**O que aconteceu:**
Ao reescrever o CSS, colocar `body.app-ready { }` como placeholder e depois adicionar `* {` na linha seguinte, o CSS parser ficou confuso e o arquivo ficou com sintaxe quebrada. O `body.app-ready` ficou como regra CSS sem chaves de fechamento.

**Como detectar:**
- `node --check` não funciona em arquivos `.html` diretamente — precisa extrair o JS com regex sofisticado
- O `node -e` com regex `<script>` só pegava o PRIMEIRO script (external) e não o inline
- O único método confiável é encontrar o script pelo conteúdo: `html.indexOf('const firebaseConfig')` até `lastIndexOf('</script>')`

**Como evitar:**
- Nunca deixar regras CSS incompletas (blocos sem corpo)
- Sempre verificar sintaxe extraindo o JS do conteúdo, nunca assumindo que `</script>` está no lugar certo
- player.html tem 3 scripts externos (`<script src>`) e 1 inline (`<script>` sem src) — o inline é o ÚLTIMO `<script>` no arquivo

---

### 2. player.html — `craft-result` null
**O que aconteceu:**
`verificarReceitaEmTempoReal()` era chamada em `checkRender()` antes do DOM estar pronto. `document.getElementById('craft-result')` retornava null.

**Como evitar:**
Sempre adicionar guard clause:
```js
const resSlot = document.getElementById('craft-result');
if (!resSlot) return;
```

---

### 3. player.html — Firebase set com undefined (viagem.state.path)
**O que aconteceu:**
`travelState` continha `path: [loc1, loc2, loc3]` que era um array de strings. Ao salvar no Firebase, valores de array são aceitos mas depois na leitura o Firebase retorna null para propriedades não reconhecidas. Erro: `value argument contains undefined in property 'characters.X.viagem.path.1'`

**Como evitar:**
- Nunca salvar arrays dentro de objetos que vão pro Firebase sem sanitizar
- Timestamps devem ser convertidos para segundos (não milissegundos) — Firebase pode rejeitar valores >1e12
- Ao restaurar, detectar formato com threshold: `> 1e12` = milissegundos, senão = segundos

---

### 4. player.html — admin.html — `else if` sem chave de fechamento
**O que aconteceu:**
Duas funções idênticas de criação de conexão coexestiam em admin.html — uma usava `}` antes do `else if` e outra não. O editor inseriu uma nova função sem a chave.

**Como evitar:**
- Antes de adicionar código novo, verificar se a mesma função já existe (grep no arquivo)
- Sempre procurar duplicatas antes de criar novas funções

---

### 5. player.html — `locSelectedChars` duplicado em admin.html
**O que happened:**
admin.html tinha `let locSelectedChars=[]` e depois `let locSelectedChars=new Set()` — duas declarações da mesma variável.

**Como evitar:**
- Sempre verificar se variável já existe com grep antes de declarar
- Usar Ctrl+F / grep ANTES de escrever código novo

---

### 6. player.html — dupla `tab-combat` no HTML
**O que aconteceu:**
Ao adicionar tabs, copiei a linha `tab-combat` duas vezes acidentalmente.

**Como evitar:**
- Sempre ler o HTML ao redor antes de inserir para ver o que já existe
- Evitar copiar/colar blocos sem verificar o resultado

---

## Erros de Design / UX

### 7. Dado do player — design feio, modal separado, funcional demais
**O que aconteceu:**
Criei um modal separado com input自由的, muitos botões de dados, checkbox de privado — completamente diferente do resto do app que usa tabs integradas ao menu.

**O que o usuário queria:**
- Um tab (não modal) igual grimorio e diario
- Apenas um botão D20 (não multi-dado)
- Sem privado
- Bonito (estética dark fantasy consistente com o resto)
- Mobile-first

**Como evitar:**
- Estudar o código existente ANTES de criar algo novo
- Perguntar ao usuário o que ele quer especificamente antes de implementar
- Manter consistência com o design language existente
- Testar no mobile (resize do browser)
- Nunca adicionar funcionalidade não solicitada (privado, multi-dado, etc.)

---

### 8. Dado do player — animação mal implementada
**O que aconteceu:**
Tentei colocar animação com dado girando mas ficou confuso e mal feito.

**Como fazer corretamente:**
- Usar CSS class toggle (`.rolling`) + `setTimeout` para transição suave
- Animação no botão DURANTE o roll, não depois
- Resultado revelado após animação completa

---

### 9. Melhoria de design no player — quebrou bolsa, menu e mais
**O que aconteceu:**
Tentei melhorar o design de uma vez (particles, slots, cards, nav, etc.) e tudo ficou quebrado. O usuário odeia o resultado.

**Como evitar:**
- NUNCA mudar múltiplas coisas de uma vez
- Mudar uma coisa, testar, verificar que funciona, SÓ ENTÃO mudar a próxima
- Ter feedback rápido do usuário
- Se o usuário diz "não gostei", parar e perguntar exatamente o que mudou que ele não gostou

---

## Lições de Processo

### 10. Sempre verificar sintaxe ANTES de dizer "pronto"
- `node --check` não funciona em `.html`
- Extrair JS corretamente: pelo conteúdo, não pela posição
- player.html: usar `html.indexOf('const firebaseConfig')` até `lastIndexOf('</script>')`

### 11. Sempre grepar ANTES de adicionar código novo
- Buscar duplicatas de funções
- Buscar variáveis já declaradas
- Buscar IDs já existentes no HTML

### 12. Sempre ler o código ao redor ANTES de inserir
- Ver o que vem antes e depois
- Evitar duplicatas de IDs/elements
- Evitar conflitos de CSS classes

### 13. Testar incrementalmente
- Mudar uma coisa
- Verificar sintaxe
- Mostrar ao usuário
- Só continuar se aprovado

### 14. O usuário é a referência de design, não eu
- Não inventar design sozinho
- Perguntar o que ele quer ver
- Mostrar referência visual se necessário
- Nunca assumir que sei melhor que o usuário

### 15. git checkout é seu amigo
- Se bagunçou tudo, `git checkout arquivo.html` restaura imediatamente
- Sempre fazer backup antes de mudanças grandes

---

## Checklist Antes de Entregar Qualquer Coisa

- [ ] Verificar sintaxe JS com método correto de extração
- [ ] grep por duplicatas de funções/variáveis/IDs
- [ ] ler código ao redor antes de inserir
- [ ] testar no browser (mobile e desktop)
- [ ] mostrar ao usuário e pedir confirmação
- [ ] git status para garantir que nada quebrou