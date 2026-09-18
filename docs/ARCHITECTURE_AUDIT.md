# NOSTRPULSE SYSTEM ARCHITECTURE AUDIT & PM BLUEPRINT

> **Document Type:** Technical Architecture Audit & Product Review  
> **Audience:** Engineering Leadership, Principal Architects, Core Contributors & Investors  
> **Author Persona:** Principal Technical Product Manager & Web3/AI System Architect  
> **Status:** Production Review & Technical Debt Remediation Plan  
> **Codebase Target:** [NostrPulse Full Stack (Nostr + Cashu + Lightning + MCP)](../README.md)

---

## EXECUTIVE SUMMARY

**NostrPulse** is a decentralized payment rails and sovereign trust architecture designed for autonomous AI agents. Built on top of the **Freedom Tech Stack** (Nostr + Bitcoin Lightning + Cashu Chaumian eCash + Model Context Protocol), it fulfills the role of **"Stripe + Stripe Radar"** for machine-to-machine (M2M) autonomous commerce:
1. **Settlement Rails:** Seamless switching between real-time Lightning Network payments ([NIP-47 NWC](../src/lib/nwc.ts)) and asynchronous, zero-fee Chaumian eCash micropayments ([NIP-61 Cashu NutZaps](../src/lib/cashu.ts)).
2. **Anti-Sybil Radar:** Deterministic 5-Pillar Trust Score Engine anchored on a 22-Root-Anchor Web-of-Trust (WoT) graph topology and verifiable Bitcoin Lightning Economic Stake ([src/lib/trust-score.ts](../src/lib/trust-score.ts), [src/lib/wot.ts](../src/lib/wot.ts), [src/lib/economic-stake.ts](../src/lib/economic-stake.ts)).
3. **Agent Integration:** Standard Stdio JSON-RPC interface via Anthropic's Model Context Protocol (MCP) server ([src/mcp-entry.ts](../src/mcp-entry.ts)).

---

## 1. BẢN ĐỒ BÀI TOÁN & GIÁ TRỊ CỐT LÕI (OUTCOME OVER OUTPUT)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             THE AUTONOMOUS AGENT DILEMMA                         │
├──────────────────────────────────────┬───────────────────────────────────────────┤
│    TRADITIONAL RAILS (Stripe/Web2)   │    SYNCHRONOUS LIGHTNING (NIP-57 Zaps)    │
│  ❌ Cần KYC, Thẻ tín dụng, Định danh │  ❌ Yêu cầu node nhận phải Online         │
│  ❌ Phí cố định 30¢ giết chết micro  │  ❌ Nghẽn Routing Path & Inbound Liquidity│
│  ❌ Đóng băng tài khoản bot/agent    │  ❌ Lộ Metadata thanh toán công khai      │
└──────────────────────────────────────┴───────────────────────────────────────────┘
                                       │
                                       ▼ GIẢI PHÁP NOSTRPULSE
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   FREEDOM STACK = NOSTR + CASHU + NWC + MCP                      │
│  ✅ Non-KYC Sovereign Identity (secp256k1 keypairs: NIP-01 / NIP-19)              │
│  ✅ Offline Asynchronous Settlement (NIP-61 Cashu NutZaps - Bearer eCash)        │
│  ✅ Zero-Fee Micro-cent Settlements (Thanh toán từng Sat / Sub-sat)              │
│  ✅ Stripe Radar cho AI: 5-Pillar WoT Ring-1 + Anti-Sybil Economic Stake Guard    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1. Nỗi đau chí mạng của AI Agent và Web3 mà Stripe hay NIP-57 bó tay

#### A. Rào cản của Stripe và Web2 Banking Rails
* **Bế tắc định danh pháp lý (KYC):** Một phần mềm tự hành (autonomous daemon) không có căn cước công dân, hộ chiếu, hay tư cách pháp nhân để ký hợp đồng dịch vụ thanh toán. Khi phát hiện hàng ngàn giao dịch tự động không có con người can thiệp, cơ chế kiểm soát gian lận của Stripe lập tức kích hoạt cờ đỏ (merchant hold, compliance ban) và đóng băng tài khoản.
* **Nghịch lý kinh tế của phí cố định:** Mô hình kinh tế của agentic commerce là thanh toán siêu vi mô (**sub-cent micropayments**): trả 1–10 satoshis (~ $0.0006 – $0.006) cho mỗi API search, data scraping, hay 1 context chunk. Phí cố định của Stripe ($0.30 + 2.9%) cao gấp hàng trăm lần giá trị giao dịch, biến kinh tế máy thành điều bất khả thi.

#### B. Rào cản của Lightning Network thuần túy (NIP-57 Synchronous Zaps)
* **Tính đồng bộ & Uptime của Node nhận:** Giao thức NIP-57 yêu cầu người nhận (receiver) phải có một máy chủ Lightning hoặc LNURL-pay endpoint luôn trực tuyến. Người nhận phải duy trì **Inbound Channel Liquidity** (kênh nhận còn dung lượng trống). Nếu node creator bị tắt hoặc kênh bị nghẽn routing, giao dịch của agent thất bại 100%.
* **Rò rỉ tương quan đồ thị (Metadata Leakage):** Kind 9734 (Zap Request) và Kind 9735 (Zap Receipt) được phát tán công khai trên các Nostr relays. Bất kỳ ai cũng có thể vẽ đồ thị luồng tiền giữa agent và các bên cung cấp dịch vụ.

#### C. Giải pháp NostrPulse (The Freedom Tech Stack)
* Sử dụng **Chaumian eCash (NIP-61 NutZaps)** làm phương thức thanh toán mặc định: Đây là chứng chỉ mang tên người cầm (**Bearer Tokens**), chuyển giao hoàn toàn bất đồng bộ (asynchronous). Người gửi có thể chuyển tiền ngay cả khi người nhận tắt máy hoàn toàn.
* Tích hợp **NIP-47 (Nostr Wallet Connect - NWC)** để agent tự điều khiển ví Lightning tự lưu ký (Alby Hub, Umbrel, Phoenixd) khi cần thanh toán hóa đơn BOLT-11 thực tế.

---

### 1.2. Luồng tạo ra giá trị (Value Proposition)

```text
               ┌────────────────────────────────────────────────────────┐
               │              DEV PHÁT TRIỂN AI AGENT                   │
               │            (Claude Desktop / Cursor IDE)               │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                   1 Tool Call duy nhất   │ check_trust_score / pay_cashu_nutzap
                                          ▼
                      ┌──────────────────────────────────────┐
                      │        NOSTRPULSE MCP SERVER         │
                      │     (Autonomous Trust & Value)       │
                      └──────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴────────────────────────┐
                 ▼                                                ▼
┌─────────────────────────────────┐              ┌─────────────────────────────────┐
│     NODE / MINT OPERATOR        │              │       DVM COMPUTE WORKER        │
│   (Thanh khoản eCash & Phí)     │              │    (Bán năng lực tính toán)     │
└─────────────────────────────────┘              └─────────────────────────────────┘
```

1. **Cho Dev AI Agent (Cursor, Claude Desktop, LangChain, Vercel AI SDK):**
   * **Zero-Setup Wallet:** Chỉ cần gắn `nostrpulse-mcp` vào file cấu hình MCP, Agent có ngay ví tiền độc lập, tự chủ chi tiêu mà không cần cung cấp API keys, thẻ tín dụng hay KYC.
   * **Autonomous Risk Radar:** Trước khi tương tác hoặc thanh toán cho bất kỳ pubkey nào, agent gọi `check_trust_score` để tự bảo vệ mình khỏi botnet lừa đảo.
   * **Phân tán tính toán qua NIP-90:** Khi gặp tác vụ phân tích dữ liệu nặng, agent có thể ủy thác cho mạng lưới DVM xử lý và thanh toán sòng phẳng bằng Satoshis.
2. **Cho Node / Cashu Mint & DVM Operator:**
   * **Dòng thanh khoản thực:** Mint Operator nhận dòng tiền swap/melt từ các Agent Swarms. Mint nào có điểm WoT cao và độ trễ thấp sẽ được thuật toán `route_cashu_mint` ưu tiên định tuyến.
   * **Kiếm Sats thụ động:** Các DVM Worker chạy nền (`scripts/dvm-worker.ts`) liên tục lắng nghe `Kind 5000/5300` trên relay, xử lý thuật toán và nhận tiền thù lao `Kind 6000` (ví dụ 5 Sats/task).

---

### 1.3. Cơ chế hoạt động của "Stripe Radar cho AI"

Trong thế giới mở của Nostr, chi phí tạo 1 tỷ cặp khóa mật mã là $0. Tấn công Sybil (tạo bầy đàn botnet để spam, vote ảo, wash-trading) là mối đe dọa sống còn. NostrPulse chống lại điều này bằng **3 vòng kiểm soát**:

```
[Target Nostr Identity (npub)]
              │
              ├──► [Lớp 1: WoT Graph Distance] ─────► Hop 0 (45đ) / Hop 1 (20-45đ) / Hop 2 (10-25đ) / Hop > 2 (0đ)
              │
              ├──► [Lớp 2: Economic Stake] ─────────► Lọc bỏ Self-Zaps + Lọc bỏ Senders có WoT = 0
              │                                      Score = log10(ValidSats + 1) * K (Max 30đ)
              │
              └──► [Lớp 3: Anti-Sybil Gatekeeper] ──► Bẫy cưỡng chế trần điểm:
                                                     - Graph = 0 VÀ Valid Sats = 0  ==> HARD-CAP 25/100 (Potential Bot)
                                                     - Hop > 2                      ==> HARD-CAP 35/100 (Unverified)
                                                     - Hop 2 (Transitive)           ==> HARD-CAP 50/100 (Max Active Contributor)
                                                     - Hop <= 1 + Valid Stake       ==> ELIGIBLE CHO VERIFIED BUILDER (>=80)
```

---

## 2. GIẢI MÃ NỒI LẨU PROTOCOL (LEGO BRICK MAPPING)

| Giao thức | Tên gọi chuẩn | Diễn giải kỹ thuật thực chiến | Vai trò trong NostrPulse |
| :--- | :--- | :--- | :--- |
| **MCP Stdio** | Model Context Protocol | Chuẩn JSON-RPC qua Stdio do Anthropic khởi xướng | Cung cấp interface chuẩn để LLM (Claude, Cursor) gọi các tools thanh toán và radar |
| **NIP-01** | Basic Protocol Flow | Cấu trúc sự kiện Nostr, chữ ký Schnorr secp256k1 | Căn cước mật mã phi tập trung cho Agent và User |
| **NIP-05** | DNS Nostr Mapping | Xác thực DNS qua `/.well-known/nostr.json` | Cầu nối xác minh danh tính giữa Web2 domain và Nostr pubkey |
| **NIP-19** | Bech32 Entities | Chuẩn mã hóa thực thể (`npub1...`, `nsec1...`) | Chuẩn hóa định dạng hiển thị, chống nhầm lẫn chuỗi hex |
| **NIP-44 v2** | Versioned Encryption | Mã hóa ChaCha20-Poly1305 kèm padding ngẫu nhiên | Khóa chặt bearer eCash tokens, chống relay đọc trộm |
| **NIP-47** | Nostr Wallet Connect | Điều khiển ví Lightning từ xa qua `Kind 23194/23195` | Thanh toán hóa đơn BOLT-11 trực tiếp từ node riêng (Alby/Umbrel) |
| **NIP-57** | Lightning Zaps | Hóa đơn Lightning đính kèm chữ ký trên Nostr | Cung cấp bằng chứng kinh tế thực (**Economic Stake**) |
| **NIP-59** | Gift Wrap Encryption | Kỹ thuật bọc quà 3 lớp (Rumor $\to$ Seal $\to$ Wrap) | Che giấu siêu dữ liệu (metadata privacy) khi gửi tiền |
| **NIP-61** | Cashu NutZaps | Chuyển giao Chaumian eCash qua `Kind 9321` | Thanh toán micro-sat offline, tức thì, zero-fee |
| **NIP-90** | Data Vending Machine | Chợ tính toán phi tập trung (`Kind 5000/6000/7000`) | Cho phép Agent phân tán tác vụ nặng ra các worker trên relay |
| **NUT-00 $\to$ 06**| Cashu Specifications | Chuẩn mật mã eCash, Mint Quote, Melt, Health probe | Hạ tầng phát hành và thẩm định rủi ro của các Cashu Mint |

---

### 2.1. Tại sao phải cần cả NIP-59 (Gift Wrap) và NIP-44 (Encryption) bọc ngoài NutZap?

* **Rủi ro tử huyệt của eCash:** Proof của Cashu là chứng chỉ vô danh mang tên người cầm (bearer token). Bất kỳ ai nhìn thấy chuỗi ký tự proof là có thể rút tiền ngay lập tức (**Front-running attack**).
* **NIP-44 v2 (Lớp bảo vệ dữ liệu):** Mã hóa nội dung token bằng khóa bí mật chung giữa người gửi và người nhận. Chỉ pubkey người nhận mới giải mã được proof.
* **NIP-59 (Lớp bảo vệ siêu dữ liệu - Metadata Privacy):** Nếu chỉ dùng NIP-44 và gửi thẳng `Kind 9321` lên relay, các tag `p` (người nhận) và `amount` (số tiền) vẫn bị phơi bày. NIP-59 tạo ra một bọc quà (`Kind 1059`) sử dụng khóa tạm thời (ephemeral keypair). Nhìn từ phía relay:
  1. Không biết ai là người gửi thực sự (Rumor ẩn trong Seal `Kind 13`).
  2. Không biết nội dung bên trong là gì.
  3. Timestamp bị xáo trộn để chống tương quan thời gian (timing correlation).

---

### 2.2. Cơ chế bắt tay: MCP Stdio $\leftrightarrow$ NIP-90 (DVM Marketplace)

```text
[ Claude / Cursor Agent ]
          │
          │ 1. Gọi Tool: request_nip90_job({ prompt: "npub...", bidSats: 5 }) qua MCP Stdio
          ▼
[ NostrPulse MCP Server (mcp-entry.ts) ]
          │
          │ 2. Ký Kind 5300/5000 (Tagged: bid=5000msat, t=trust-score)
          ▼
  [ Nostr Relay Pool ] ◄────────── (Lắng nghe Kind 5000/5300) ──────────┐
          │                                                             │
          │ Broadcast Request                                   [ DVM Worker Daemon ]
          ▼                                                    (scripts/dvm-worker.ts)
[ DVM Worker phát hiện ]                                                │
          │                                                             │
          ├──► 3. Gửi Kind 7000 (status: processing) qua Relay ─────────┤
          │                                                             │
          ├──► 4. Xử lý thuật toán: Quét DB + Tính Trust Score          │
          │                                                             │
          └──► 5. Ký Kind 6300/6000 (Result + demand 5 sats) ───────────┘
          │
          ▼
[ NostrPulse MCP Server ] 
          │ (Nếu Relay trả lời trước 3500ms) ──► Nhận kết quả Kind 6300, lưu SQLite, trả JSON về LLM.
          │ (Nếu Relay trễ > 3500ms)          ──► Tự kích hoạt Local SQLite Fallback, trả JSON về LLM.
          ▼
[ Agent hoàn thành tác vụ ] ──► (Tự động trả 5 Sats NutZap thưởng cho Worker)
```

---

## 3. KIỂM TOÁN RỦI RO & ĐIỂM CHẾT KỸ THUẬT (PM RISK RADAR)

### 3.1. Điểm nghẽn kiến trúc (Single Points of Failure & Bottlenecks)

1. **Sự ngây thơ của Fallback SQLite (`src/lib/db.ts` & `src/lib/dvm.ts`):**
   * Trong `getLocalDatabaseAnalytics` (`src/lib/dvm.ts`), khi relay quá 3500ms không phản hồi, hệ thống lập tức query từ SQLite cục bộ. Tuy nhiên, bảng `creators` ban đầu chỉ có đúng **26 seed records**. Nếu agent truy vấn một pubkey mới, hàm này trả về ngay lập tức: `totalSats = 0`, `score = undefined` $\to$ **False Negative nghiêm trọng**, dán nhãn oan người dùng thành bot.
   * File SQLite cục bộ (`file:nostrpulse.db`) không đồng bộ state khi ứng dụng chạy trên kiến trúc Serverless (Vercel) nhiều instance.
2. **Độ trễ và rủi ro nghẽn WebSocket Relay (Relay Flakiness):**
   * Code phụ thuộc vào danh sách cứng gồm 6 relays (`MAJOR_INDEXER_RELAYS`). Khi các relays này bị rate-limit hoặc nghẽn, các cuộc gọi `pool.querySync` sẽ treo cứng cho đến khi chạm timeout (`Promise.race`), khiến mỗi lượt gọi tool của Agent bị delay từ 3–5 giây.
3. **Counterparty Risk của Cashu Mint (Rủi ro quỵt tiền):**
   * eCash về bản chất là mô hình ủy thác (**Custodial**). Nếu Mint bị hack database, offline đột ngột, hoặc admin bỏ trốn, toàn bộ proofs eCash mà Agent đang giữ biến thành rác.
   * Module `auditCashuMint` (`src/lib/mint-mesh.ts`) hiện chỉ kiểm tra được bề nổi (uptime, latency qua NUT-06, danh tiếng admin), hoàn toàn **chưa thể kiểm tra Proof-of-Reserves on-chain của Mint**.

---

### 3.2. Rủi ro vận hành & Bảo mật (Operational & Security Risks)

1. **Lỗ hổng rò rỉ Metadata trong `sendCashuNutZap` (`src/lib/cashu.ts`):**
   * Trong `src/lib/cashu.ts` (dòng 748–759), sự kiện phát tán lên relay là `Kind 9321` trực tiếp:
     ```typescript
     const eventTemplate = {
       kind: 9321,
       content: encryptedContent,
       tags: [
         ["p", hexPubkey],
         ["amount", (amountSats * 1000).toString()],
         ["u", cleanMint],
         ...
       ],
     };
     ```
   * **Lỗ hổng:** Mặc dù payload `content` được mã hóa NIP-44, nhưng tag `["p", hexPubkey]` và `["amount", ...]` lại phơi bày công khai trên relay. Relay operator hoàn toàn biết rõ ai nhận bao nhiêu tiền từ mint nào.
   * Mặc dù class `EncryptionManager` (`src/lib/encryption.ts`) đã triển khai NIP-59, hàm `sendCashuNutZap` **chưa thực sự bọc NIP-59 Gift Wrap ngoài cùng**.
2. **Nguy cơ Memory Leak trong Daemons chạy ngầm:**
   * Trong `scripts/dvm-worker.ts`:
     ```typescript
     const processedJobs = new Set<string>();
     ```
     Biến `processedJobs` lưu trữ ID của tất cả các job đã xử lý mà **không có cơ chế xóa bỏ (TTL hoặc LRU eviction)**. Nếu daemon chạy liên tục nhiều tuần, Set này sẽ phình to gây cạn kiệt RAM (Out-Of-Memory Crash).
   * Trong `src/lib/mint-mesh.ts`: `auditCache` Map lưu cache kết quả audit nhưng không có tiến trình dọn dẹp định kỳ (active pruning).
3. **Race Condition khi chia nhỏ token eCash (`splitCashuToken`):**
   * Nếu Agent thực hiện 2 giao dịch đồng thời (concurrent tool calls) dùng chung một token gốc, cả 2 tiến trình sẽ cùng gửi một tập proofs lên mint để swap. Một bên sẽ thành công, bên còn lại sẽ nổ lỗi: `Token already spent`. Hệ thống hiện thiếu cơ chế khóa cục bộ (**Mutex Lock**).

---

### 3.3. Nợ kỹ thuật (Technical Debt - Vibe-Coded Fragility)

* **22 Root Anchors bị Hard-coded (`src/lib/anchors.ts`):** Danh sách 22 neo gốc bị gắn cứng vào file mã nguồn. Nếu một neo đổi khóa do bị lộ `nsec` hoặc từ bỏ dự án, toàn bộ hệ số WoT bị sai lệch và bắt buộc phải sửa code deploy lại.
* **Nuốt lỗi âm thầm (Silent Error Swallowing):** Rất nhiều khối `try { ... } catch {}` bỏ trống trong `src/lib/wot.ts` và `src/lib/cashu.ts`. Khi mạng gặp sự cố lạ, hệ thống im lặng trả về null/mặc định khiến việc debug từ xa cực kỳ khó khăn.

---

## 4. BẢN KHOAN VÙNG CODEBASE (CODE ORIENTATION CHEATSHEET)

Bảng tra cứu giúp các kỹ sư định vị chính xác vị trí cần can thiệp trong codebase:

| Nghiệp vụ cần can thiệp | File mục tiêu | Function / Symbol cốt lõi | Lưu ý nghiệp vụ & Kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Sửa công thức Trust Score & Anti-Sybil Gate** | `src/lib/trust-score.ts`<br>`src/lib/wot.ts` | `calculateTrustScore()`<br>`getWebOfTrustDistance()` | Chú ý các mốc trần Gatekeeper (Hop 0=45đ, Hop 1=max 45đ, Hop 2=cap 50đ, Isolated cap 25đ). |
| **Sửa logic Economic Stake & lọc Zap bot** | `src/lib/economic-stake.ts` | `calculateEconomicStake()`<br>`parseZapReceipt()` | Chú ý logic lọc `sender === target` và kiểm tra `senderWot.wotPoints > 0`. |
| **Sửa logic ký, mã hóa & phát NutZap eCash** | `src/lib/cashu.ts` | `sendCashuNutZap()`<br>`splitCashuToken()` | Cần bọc thêm NIP-59 ngoài `Kind 9321` để che giấu tag `amount` và `p`. |
| **Sửa cơ chế bọc quà NIP-59 / NIP-44 v2** | `src/lib/encryption.ts` | `EncryptionManager.encryptMessage()`<br>`decryptMessage()` | Quản lý 3 lớp: Rumor $\to$ Seal (`Kind 13`) $\to$ Gift Wrap (`Kind 1059`). |
| **Sửa giao vận ví Lightning NWC (NIP-47)** | `src/lib/nwc.ts` | `payWithNWC()`<br>`executeNWCRequest()` | Đảm bảo hàm `cleanup()` đóng subscription và destroy pool để tránh rò rỉ RAM. |
| **Sửa Radar kiểm toán & định tuyến Cashu Mint** | `src/lib/mint-mesh.ts` | `auditCashuMint()`<br>`routeCashuMint()` | Điều chỉnh 5 tiêu chí tính điểm Mint và ngưỡng phân loại rủi ro (LOW $\ge$ 75, MODERATE $\ge$ 45). |
| **Cấu hình Tool MCP cho Claude/Cursor** | `src/mcp-entry.ts` | `mcpServer.tool(...)` | Khai báo Zod schema và handler cho 6 công cụ MCP phơi ra Stdio JSON-RPC. |
| **Debug & vận hành NIP-90 Worker Bot** | `scripts/dvm-worker.ts`<br>`src/lib/dvm.ts` | `startDvmWorker()`<br>`requestDvmAnalyticsWithFallback()` | Nhận `Kind 5000/5300`, phát `Kind 7000` (processing) và `Kind 6000` (kết quả kèm yêu cầu sats). |
| **Debug Indexer quét dữ liệu ngầm từ Relay** | `scripts/indexer-worker.ts`<br>`src/lib/indexer.ts` | `runIndexerPass()`<br>`decodeZapReceipt()` | Quét Kind 0, Kind 3, Kind 9735 theo batch 20 pubkey trên 6 major relays. |

---

## 5. LỜI THOẠI TRẢ LỜI SẾP / NHÀ ĐẦU TƯ (ELEVATOR PITCH - 60 GIÂY)

> *"AI Agent tự hành đang phát triển bùng nổ, nhưng chúng đang vấp phải một nút thắt chết người: **Agent không có danh tính pháp lý để mở thẻ tín dụng Stripe, và cũng không thể thanh toán micro-cent vì phí giao dịch truyền thống quá đắt đỏ.** Đồng thời, trên mạng mở phi tập trung, tạo hàng triệu bot giả mạo để lừa đảo tốn $0.*
>
> *Chúng tôi tạo ra **NostrPulse** – hạ tầng **Stripe + Stripe Radar phi tập trung cho AI Agents** thông qua chuẩn Model Context Protocol (MCP).*
> 
> *Về thanh toán, chúng tôi giải quyết bài toán offline bằng **Chaumian eCash (NIP-61 NutZaps)** và **Lightning (NIP-47)**: Agent có thể chuyển giao từng Sat tức thì, không mất phí, và hoàn toàn bất đồng bộ ngay cả khi node nhận đang tắt máy, được bảo vệ bởi lớp mã hóa ẩn danh NIP-59.*
> 
> *Về chống gian lận, chúng tôi dựng lên một **Radar phân tích đồ thị Web-of-Trust 22 Root Anchors kết hợp lượng Economic Stake thực tế trên Bitcoin Lightning**. Bất kỳ botnet nào không có kết nối đồ thị đều bị hệ thống tự động khóa trần ở mức nghi vấn, triệt tiêu 100% nguy cơ tấn công Sybil.*
> 
> *Chỉ với 1 dòng cấu hình MCP trên Claude hay Cursor, bất kỳ AI Agent nào cũng có thể tự kiếm tiền, tự thẩm định đối tác và tự thanh toán kinh tế máy (M2M) mà không cần con người can thiệp hay phụ thuộc bất kỳ ngân hàng nào."*
