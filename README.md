# ICOP-AL — Apoio à decisão em dor orofacial

Aplicativo web estático para apoio à decisão clínica, baseado no **algoritmo da
International Classification of Orofacial Pain (ICOP-AL)**. Conduz o usuário por
uma árvore de perguntas clínicas, uma de cada vez, até um diagnóstico provável,
com o **código ICOP**, o **nome oficial em português** e os **critérios
diagnósticos resumidos**.

> **Aviso:** ferramenta de apoio à decisão clínica. Não substitui o julgamento
> clínico nem a anamnese e o exame completos.

Site por **Profa. Dra. Juliana Stuginski Barbosa** · [@dtmdororofacial](https://instagram.com/dtmdororofacial)

---

## O que o app faz

- Tela de abertura com instruções de uso.
- Navegação **nó a nó** (sim/não ou múltipla escolha), conforme o algoritmo.
- Botão **Voltar** (corrige a resposta anterior sem reiniciar) e **Reiniciar**.
- **Barra de progresso** e indicador do ramo (categoria) atual.
- Aviso de **sinais de alerta (red flags)** no início.
- Tela de **resultado**: código ICOP, nome PT-BR e critérios resumidos.
- Botão **"Detalhar diagnóstico (subtipos)"** para descer do diagnóstico de
  primeiro/segundo nível até o subtipo mais específico (até o 7º dígito).
- Botão **Copiar resultado** (texto pronto para prontuário).
- Totalmente em português, responsivo (funciona bem no celular) e **offline**
  depois de carregado (sem CDNs, sem rastreamento).

Cobertura atual: **186 diagnósticos** nas 6 categorias do ICOP.

## Estrutura de arquivos

```
icop-app/
├── index.html            Estrutura da página (telas e botões)
├── style.css             Visual (paleta clínica, responsivo)
├── script.js             Lógica de navegação (carrega o JSON e conduz a árvore)
├── data/
│   └── icop-tree.json    A ÁRVORE DE DECISÃO (todo o conteúdo clínico)
└── README.md             Este arquivo
```

Para **editar o conteúdo clínico**, mexa apenas em `data/icop-tree.json`. O
código (`index.html`, `style.css`, `script.js`) não precisa ser alterado.

---

## Como publicar no GitHub Pages

### Pela primeira vez (pelo site, sem terminal)

1. Em **github.com**, crie um repositório (ex.: `icop`), **Público**, sem README.
2. Na página do repositório: **Add file → Upload files**.
3. Arraste `index.html`, `style.css`, `script.js` e a pasta `data` (com o
   `icop-tree.json` dentro). Clique **Commit changes**.
4. **Settings → Pages → Source:** *Deploy from a branch* → branch `main`,
   pasta `/ (root)` → **Save**.
5. Em ~1 minuto o site fica no ar em
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

### Pelo terminal (opcional, com o GitHub CLI `gh`)

```bash
cd icop-app
gh auth login                 # uma vez
gh repo create icop --public --source=. --remote=origin --push
gh api -X POST "repos/$(gh api user --jq .login)/icop/pages" \
  -f "source[branch]=main" -f "source[path]=/"
```

### Atualizar depois de uma mudança

- **Pelo site:** *Add file → Upload files*, suba o(s) arquivo(s) alterado(s)
  (mesmo nome substitui o antigo) → *Commit changes*.
- **Pelo terminal:**
  ```bash
  git add -A && git commit -m "descrição da mudança" && git push
  ```
- O GitHub Pages republica sozinho em ~1 minuto. Se não aparecer, faça um
  **hard refresh** (`Cmd/Ctrl + Shift + R`) ou acrescente `?v=2` ao fim da URL
  para furar o cache do navegador.

---

## Como atualizar a árvore de decisão (`data/icop-tree.json`)

O arquivo tem duas partes: `meta` (informações gerais) e `nos` (o mapa de todos
os nós). Cada nó tem um **id** (a chave) e um **tipo**.

### Tipos de nó

**1. Pergunta** — uma decisão clínica. Cada opção aponta (`proximo`) para o id
do próximo nó.

```json
"q_dente": {
  "tipo": "pergunta",
  "ramo": "1. Dor odontogênica / dentoalveolar",
  "texto": "Há dor em algum dente?",
  "ajuda": "Texto opcional de apoio.",
  "opcoes": [
    { "rotulo": "Sim", "proximo": "q_pulpar_evidencia" },
    { "rotulo": "Não", "proximo": "q_gengiva" }
  ]
}
```

**2. Aviso** — uma tela informativa (ex.: red flags). Segue para um único
`proximo`. O campo `detalhes` (opcional) vira uma lista.

```json
"info_red_flags": {
  "tipo": "aviso",
  "ramo": "Triagem inicial",
  "texto": "Atenção aos sinais de alerta...",
  "detalhes": ["item 1", "item 2"],
  "proximo": "q_dente"
}
```

**3. Resultado** — um diagnóstico (ou desfecho). Mostra código, nome e
critérios. Se tiver subtipos, o campo `refinar` aponta para a pergunta de
refinamento (que aparece no botão "Detalhar").

```json
"r_1_1_1": {
  "tipo": "resultado",
  "diagnostico": true,
  "codigo": "1.1.1",
  "nome": "Dor pulpar",
  "categoria": "1. Dor odontogênica",
  "criterios": [
    "Dor em um dente.",
    "Evidência de lesão... capaz de produzir dor pulpar.",
    "Não melhor explicada por outro diagnóstico da ICOP."
  ],
  "refinar": "qr_1_1_1"
}
```

- `diagnostico: false` é usado para desfechos que não são diagnóstico
  (ex.: "Sem dor orofacial"); nesse caso `codigo` pode ser `"—"`.
- `refinar` é **opcional**: só existe quando o diagnóstico tem subtipos.

### Onde começa a árvore

O campo `meta.no_inicial` indica o id do primeiro nó (atualmente `q_origem`).

### Regras de ouro ao editar

1. **Todo `proximo`, `refinar` e id de opção deve apontar para um id que
   existe** em `nos`. Erro de digitação aqui quebra a navegação.
2. **Use o nome oficial PT-BR** do diagnóstico (conforme a tradução da ICOP).
3. Mantenha os **critérios resumidos** (3–5 itens-chave), não o texto integral.
4. Não crie ciclos (um caminho que volta para um nó já visitado).
5. Valide o JSON antes de publicar (veja abaixo).

### Validar o JSON

Qualquer validador de JSON serve (ex.: cole em <https://jsonlint.com>). Para uma
checagem de integridade dos links, com Python instalado:

```bash
python3 - <<'PY'
import json
d=json.load(open('data/icop-tree.json')); nos=d['nos']; ids=set(nos)
def nexts(n):
    out=[o['proximo'] for o in n.get('opcoes',[])]
    if n.get('proximo'): out.append(n['proximo'])
    if n.get('refinar'): out.append(n['refinar'])
    return out
ruins=[(k,v) for k,n in nos.items() for v in nexts(n) if v not in ids]
print("Links quebrados:", ruins or "nenhum")
print("Total de nós:", len(nos))
PY
```

---

## Fontes

- **Algoritmo:** Shakeri H, Vueghs C, Benoliel R, May A, Conti P, Renton T,
  Baad-Hansen L, Van der Cruyssen F. *Development and validation of the
  International Classification for Orofacial Pain Algorithm (ICOP-AL).* PAIN
  167 (2026) e1–e7 (e material suplementar).
- **Classificação e nomenclatura PT-BR:** *Classificação Internacional de Dor
  Orofacial, Primeira Edição (ICOP)* — tradução para o português brasileiro.
  Conti PCR et al., Headache Medicine 2022;13(1):3-97.

## Tecnologia

HTML, CSS e JavaScript puro, sem framework e sem etapa de build. Sem
dependências externas: roda direto do GitHub Pages e funciona offline depois de
carregado. Sem bibliotecas de analytics ou rastreamento.
