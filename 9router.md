# 9Router Research Summary & Integration Guide

This document provides a comprehensive research summary of **9Router** (developed by decolua). It outlines how 9Router works, its configuration architecture, and how it strategically integrates as the gateway proxy layer for our **Bludai Agent CLI** workflow.

---

## 1. What 9Router Is & How It Works

9Router is an open-source, local-first  **AI API Gateway and Proxy** . It sits as a middleman between your application (or agent) and upstream AI model providers.

<pre><div class="relative whitespace-pre-wrap word-break-all my-2 rounded-xl bg-muted border" node="[object Object]"><div class="min-h-7 relative box-border flex flex-row items-center justify-between rounded-t border-b border-border px-2 py-0.5"><div class="font-sans text-sm text-muted-foreground"></div><div class="flex flex-row gap-2 justify-end"><button class="appearance-none bg-transparent border-0 p-0 cursor-pointer text-secondary-foreground hover:text-foreground transition-colors" aria-label="Copy code"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="h-3.5 w-3.5"><path d="M362.31-260Q332-260 311-281t-21-51.31V-787.69Q290-818 311-839t51.31-21H697.69Q728-860 749-839t21,51.31v455.38Q770-302 749-281t-51.31,21H362.31Zm0-60H697.69q4.62,0 8.46-3.85t3.85-8.46V-787.69q0-4.62-3.85-8.46T697.69-800H362.31q-4.62,0-8.46,3.85T350-787.69v455.38q0,4.62 3.85,8.46t8.46,3.85Zm-140,200Q192-120 171-141t-21-51.31V-707.69h60v515.38q0,4.62 3.85,8.46t8.46,3.85H617.69v60H222.31ZM350-320q0,0 0-3.85t0-8.46V-787.69q0-4.62 0-8.46t0-3.85q0,0 0,3.85t0,8.46v455.38q0,4.62 0,8.46t0,3.85Z"></path></svg></button></div></div><div class="p-3"><div class="w-full h-full text-xs cursor-text"><div class="code-block"><div class="code-line" data-line-number="1" data-line-start="1" data-line-end="1"><div class="line-content"><span>[Bludai Agent CLI] ───► [9Router Proxy (localhost:20128)] ───► [Upstream LLMs]</span></div></div><div class="code-line" data-line-number="2" data-line-start="2" data-line-end="2"><div class="line-content"><span>                               │</span></div></div><div class="code-line" data-line-number="3" data-line-start="3" data-line-end="3"><div class="line-content"><span>                       ┌───────┴───────┐</span></div></div><div class="code-line" data-line-number="4" data-line-start="4" data-line-end="4"><div class="line-content"><span>                       ▼               ▼</span></div></div><div class="code-line" data-line-number="5" data-line-start="5" data-line-end="5"><div class="line-content"><span>                [RTK Compressor] [3-Tier Fallback]</span></div></div></div></div></div></div></pre>

### Core Mechanisms

#### A. Unified API Proxy

9Router exposes an OpenAI-compatible endpoint at `http://localhost:20128/v1`. Any standard LLM client (like `openai` or `langchain`) can talk directly to it by changing their `base_url`.

#### B. 3-Tier Fallback Routing

It monitors request status. If a primary API key or model fails (due to rate limits, network timeouts, or service outage), 9Router automatically reroutes the request:

* **Tier 1:** Primary Model (Paid, e.g., Claude 3.5 Sonnet)
* **Tier 2:** Backup Model (Low cost, e.g., Gemini 2.5 Flash)
* **Tier 3:** Free Tier Model (e.g., Qwen-2.5:free)

#### C. RTK (Request/Token/Kernel) Token Saver

Coding agents generate a lot of repetitive text data (such as listing files, printing full test logs, and git diffs). 9Router intercepts this input data and compresses it (stripping out whitespace, duplicates, and terminal noises) before passing it to the model. This reduces input token costs by  **20% to 40%** .

#### D. Caveman Mode

A specialized system prompt addition that instructs models to respond in a highly concise, technical, and condensed manner. This trims output token costs by up to **65%** while keeping coding blocks completely accurate.

---

## 2. Configuration & State Architecture

Unlike frameworks that rely heavily on static files, 9Router combines **Environment Variables** (for infrastructure) and a **local SQLite database** (for routing logic and credentials).

### Environment Variables (`.env`)

* `JWT_SECRET`: Used to secure dashboard JWTs.
* `INITIAL_PASSWORD`: Login credentials for the `/dashboard`.
* `DATA_DIR`: Path to store the SQLite database (`9router.db`) and request logs.
* `PORT`: Local port to bind to (Default: `20128`).
* `REQUIRE_API_KEY`: Set to `true` to force downstream clients to authenticate with a 9Router token.

### The SQLite Database (`9router.db`)

Once 9Router is initialized, all routing paths, fallback chains, custom provider credentials (API Keys), and transaction logs are stored inside a SQLite database inside the `DATA_DIR`. This makes backup, sync, and local portability extremely simple.

---

## 3. Essential Integration for Bludai Agent CLI Workflow

Integrating 9Router into our custom LangGraph-based CLI offers several major benefits:

### A. Single Client Endpoint (Unified Base URL)

Instead of initializing separate API clients for Google Gemini, Anthropic Claude, and OpenRouter inside our LangGraph nodes, we only initialize **one client** pointing to 9Router:

<pre><div class="relative whitespace-pre-wrap word-break-all my-2 rounded-xl bg-muted border" node="[object Object]"><div class="min-h-7 relative box-border flex flex-row items-center justify-between rounded-t border-b border-border px-2 py-0.5"><div class="font-sans text-sm text-muted-foreground">python</div><div class="flex flex-row gap-2 justify-end"><button class="appearance-none bg-transparent border-0 p-0 cursor-pointer text-secondary-foreground hover:text-foreground transition-colors" aria-label="Copy code"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="h-3.5 w-3.5"><path d="M362.31-260Q332-260 311-281t-21-51.31V-787.69Q290-818 311-839t51.31-21H697.69Q728-860 749-839t21,51.31v455.38Q770-302 749-281t-51.31,21H362.31Zm0-60H697.69q4.62,0 8.46-3.85t3.85-8.46V-787.69q0-4.62-3.85-8.46T697.69-800H362.31q-4.62,0-8.46,3.85T350-787.69v455.38q0,4.62 3.85,8.46t8.46,3.85Zm-140,200Q192-120 171-141t-21-51.31V-707.69h60v515.38q0,4.62 3.85,8.46t8.46,3.85H617.69v60H222.31ZM350-320q0,0 0-3.85t0-8.46V-787.69q0-4.62 0-8.46t0-3.85q0,0 0,3.85t0,8.46v455.38q0,4.62 0,8.46t0,3.85Z"></path></svg></button></div></div><div class="p-3"><div class="w-full h-full text-xs cursor-text"><div class="code-block"><div class="code-line" data-line-number="1" data-line-start="1" data-line-end="1"><div class="line-content"><span class="token keyword">from</span><span> langchain_google_genai </span><span class="token keyword">import</span><span> ChatGoogleGenerativeAI</span></div></div><div class="code-line" data-line-number="2" data-line-start="2" data-line-end="2"><div class="line-content"></div></div><div class="code-line" data-line-number="3" data-line-start="3" data-line-end="3"><div class="line-content"><span class="token comment"># LangGraph nodes talk to 9Router, which delegates to the actual model</span></div></div><div class="code-line" data-line-number="4" data-line-start="4" data-line-end="4"><div class="line-content"><span>model </span><span class="token operator">=</span><span> ChatGoogleGenerativeAI</span><span class="token punctuation">(</span></div></div><div class="code-line" data-line-number="5" data-line-start="5" data-line-end="5"><div class="line-content"><span>    model</span><span class="token operator">=</span><span class="token string">"google/gemini-2.5-flash"</span><span class="token punctuation">,</span><span></span></div></div><div class="code-line" data-line-number="6" data-line-start="6" data-line-end="6"><div class="line-content"><span>    openai_api_base</span><span class="token operator">=</span><span class="token string">"http://localhost:20128/v1"</span><span class="token punctuation">,</span></div></div><div class="code-line" data-line-number="7" data-line-start="7" data-line-end="7"><div class="line-content"><span>    google_api_key</span><span class="token operator">=</span><span class="token string">"your-9router-token"</span></div></div><div class="code-line" data-line-number="8" data-line-start="8" data-line-end="8"><div class="line-content"><span class="token punctuation">)</span></div></div></div></div></div></div></pre>

This simplifies our node code and decouples API key management from our Python scripts.

### B. High Reliability via Fallbacks

If we run a long-running multi-agent loop that performs 50+ sequential turns (Manager -> Developer -> Executor), a single rate limit can crash the whole process. 9Router handles rate limits transparently in the background, rotating keys or switching to backup models without crashing our LangGraph loop.

### C. Development Cost Control

During development, we can test our LangGraph loop repeatedly by routing all requests through 9Router's **Free Tier Models** (e.g., `:free` open models). Once we are ready for production, we can switch the target model in our code to a paid model without changing any API credentials or gateway URLs.

### D. Observability & Debugging

Every LLM call made by our LangGraph agents is logged in the 9Router Web Dashboard. We can open `http://localhost:20128` to inspect the exact system prompts, message history, and token counts generated during our agent loops.
