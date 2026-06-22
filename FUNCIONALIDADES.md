# 📦 MESAUP - Sistema de Gestão para Bares e Lanchonetes

## Versão: 1.0.2

---

## 🏠 DASHBOARD - Visão Geral do Negócio

- **KPIs em Tempo Real:**
  - Mesas ocupadas / capacidade total
  - Comandas abertas
  - Faturamento do período
  - Receita do mês
  - Comandas fechadas
  - Despesas do período
  - Saldo período (receita - despesas)
  - Alertas de estoque

- **Filtros de Período:**
  - Hoje
  - Ontem
  - Últimos 7 dias
  - Mês atual
  - Ano atual
  - Período personalizado (data inicial e final)

- **Análise de Vendas:**
  - Vendas PDV (balcão e delivery)
  - Gráficos de receita
  - Histórico de transações

---

## 🪑 MESAS - Gerenciamento de Mesas

- **Criar Mesas:**
  - Número da mesa
  - Capacidade de pessoas
  - Status (livre/ocupada)

- **Gerenciar Mesas:**
  - Listar todas as mesas com status em tempo real
  - Editar número, capacidade e status da mesa
  - Deletar mesas
  - Visualizar mesas ocupadas (badge de alerta)
  - Acompanhamento automático de comandas por mesa

- **Funcionalidades:**
  - Impedir duplicação de números de mesa
  - Atualização de número de mesa com sincronização automática de comandas abertas

---

## 📋 COMANDAS - Controle de Pedidos por Mesa

- **Criar Comandas:**
  - Associar a uma mesa
  - Adicionar itens do cardápio com quantidade e preço
  - Calcular total automaticamente

- **Gerenciar Comandas:**
  - Listar comandas abertas e fechadas
  - Editar itens (quantidade, preço)
  - Adicionar/remover itens
  - Visualizar histórico de comandas

- **Status de Comandas:**
  - Aberta (em andamento)
  - Finalizada/Fechada (paga)
  - Cancelada

- **Funcionalidades:**
  - Cálculo automático de total
  - Badge de alerta para comandas abertas
  - Histórico de modificações
  - Sincronização com mesas

---

## 🧾 PDV & DELIVERY - Ponto de Venda e Entregas

- **Vendas PDV (Balcão):**
  - Registrar vendas rápidas (sem mesa)
  - Seleção de produtos do cardápio
  - Quantidade e preço personalizável
  - Cálculo automático de total

- **Delivery:**
  - Criar pedidos de delivery
  - Rastreamento de status:
    - Pendente
    - Preparando
    - Pronto
    - Saindo para entrega
    - Entregue
    - Cancelada
  - Gerenciar endereços de entrega
  - Cálculo de taxa de entrega
  - Badge de alerta para entregas pendentes

- **Relatórios:**
  - Vendas por período
  - Análise de delivery vs. presencial

---

## 👥 CLIENTES - CRM (Gestão de Relacionamento)

- **Cadastro de Clientes:**
  - Nome
  - Telefone
  - Email
  - Endereço
  - Observações

- **Histórico de Compras:**
  - Rastreamento de compras por cliente
  - Valor gasto
  - Frequência de compra

- **Funcionalidades:**
  - Busca por cliente
  - Editar informações
  - Deletar clientes
  - Relatório de clientes recorrentes

---

## 📱 CARDÁPIO QR CODE - Menu Digital

- **Gerar Cardápio QR Code:**
  - Produtos com fotos, descrição e preço
  - Organizado por categoria
  - QR Code para acesso mobile

- **Servidor Local:**
  - Disponibilizar cardápio em rede local via HTTP
  - Clientes podem acessar via smartphone
  - URL acessível em até 4 dígitos (http://IP:3030)

- **Personalização:**
  - Disponibilidade de produtos
  - Preços dinâmicos
  - Categorias customizáveis

---

## 📦 ESTOQUE & CARDÁPIO - Gerenciamento de Produtos

- **Cadastro de Produtos:**
  - Nome
  - Categoria
  - Preço de venda
  - Quantidade em estoque
  - Quantidade mínima (alerta)
  - Unidade de medida
  - Custo (opcional)
  - Produtos internos (insumos não vendáveis)

- **Controle de Estoque:**
  - Entrada/saída de produtos
  - Ajuste manual de quantidade
  - Alerta automático quando atinge quantidade mínima
  - Visualizar produtos com baixo estoque
  - Badge de alerta na navegação

- **Cardápio:**
  - Produtos com preço > 0 aparecem no cardápio
  - Filtro de disponibilidade
  - Busca por nome ou categoria
  - Produtos internos (insumos) ficam ocultos

- **Relatórios:**
  - Movimentação de estoque
  - Produtos mais vendidos
  - Valor de estoque total
  - Alertas de reposição

---

## 💰 FINANCEIRO - Controle Financeiro

- **Receitas:**
  - Faturamento de comandas
  - Vendas PDV
  - Vendas delivery
  - Período customizável

- **Despesas:**
  - Registrar gastos
  - Categorizar despesas
  - Data e descrição
  - Valor

- **Relatórios Financeiros:**
  - Receita vs. Despesa
  - Saldo líquido
  - Análise por período
  - Exportar para CSV/PDF/HTML
  - Gráficos de fluxo de caixa

- **Funcionalidades:**
  - Comparativo com períodos anteriores
  - Margem de lucro
  - Tendências de vendas

---

## ⚙️ CONFIGURAÇÕES - Personalização

- **Dados da Empresa:**
  - Nome do estabelecimento
  - CNPJ/CPF
  - Telefone
  - Email
  - Endereço

- **Preferências:**
  - Formato de moeda (R$)
  - Tema (claro/escuro)
  - Idioma (Português BR)

- **Integração Cloud:**
  - Sincronizar dados com nuvem (opcional)
  - Backup automático
  - Restaurar dados

---

## 📖 COMO USAR - Guia de Utilização

- Tutorial completo em português
- Explicação de cada módulo
- Dicas de uso
- FAQ comum

---

## 🔄 ATUALIZAÇÃO - Gerenciamento de Versões

- Verificar novas versões
- Download automático de atualizações
- Notificação de atualizações disponíveis
- Histórico de mudanças (changelog)

---

## ℹ️ SOBRE - Informações do Aplicativo

- Versão instalada
- Desenvolvedor: GHZ Plugin
- Contato: Ghzplugin.com.br
- Telefone: (11) 94898-1459
- Licença e termos

---

## 🎨 INTERFACE - Recursos de UX

- **Tema Claro/Escuro:**
  - Alternância rápida via botão
  - Preferência salva localmente

- **Navegação:**
  - Menu lateral com ícones
  - Acesso rápido a todos os módulos
  - Badges de alerta em tempo real

- **Badges de Alerta (em tempo real a cada 5s):**
  - 🪑 Mesas ocupadas
  - 📋 Comandas abertas
  - 📦 Produtos com estoque baixo
  - 🚚 Entregas pendentes

- **Responsividade:**
  - Resolução mínima: 1100x700
  - Resolução recomendada: 1360x860
  - Interface adaptada para desktop

---

## 💾 DADOS & SEGURANÇA

- **Armazenamento Local:**
  - Dados salvos em arquivos JSON
  - Sem dependência de internet para funcionar
  - Backup de dados

- **Exportação:**
  - Relatórios em PDF
  - Exportar para CSV (Excel)
  - Salvar HTML
  - Download via dialog de arquivo

- **Licença:**
  - Sistema com validação de licença
  - Verificação online (com fallback offline)
  - Cache de sessão

---

## 🖥️ ESPECIFICAÇÕES TÉCNICAS

- **Plataforma:** Electron (Desktop)
- **Linguagem:** JavaScript + HTML + CSS
- **Sistema Operacional:** Windows (build x64)
- **Banco de Dados:** JSON local (sem servidor)
- **Servidor Cardápio:** HTTP local na porta 3030
- **Versão Atual:** 1.0.2

---

**Desenvolvido por:** GHZ Plugin  
**Website:** Ghzplugin.com.br  
**Suporte:** (11) 94898-1459
