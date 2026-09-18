import { SimplePool, generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';

const RELAYS = ['wss://relay.primal.net', 'wss://nos.lol', 'wss://relay.nostr.band'];
const pool = new SimplePool();

async function runTest() {
  console.log('=== BẮT ĐẦU TEST NIP-90 JOB REQUEST ===');

  // 2. Sinh khóa test ngẫu nhiên (private key & public key)
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  const privKeyHex = Buffer.from(sk).toString('hex');

  console.log(`[Identity] Pubkey test: ${pk}`);
  console.log(`[Identity] Privkey hex: ${privKeyHex}\n`);

  // 3. Mở cổng lắng nghe trước (Subscribe) - truyền trực tiếp object Filter
  console.log(`[Relay] Đang kết nối và lắng nghe trên: ${RELAYS.join(', ')}...`);
  
  const sub = pool.subscribeMany(
    RELAYS,
    {
      kinds: [5000], // Lọc đúng Kind 5000 Job Request
      authors: [pk],  // Chỉ nghe event do chính con bot này bắn ra
    },
    {
      onevent(event) {
        console.log('\n THÀNH CÔNG! Relay đã nhả ngược event về terminal:');
        console.log(JSON.stringify(event, null, 2));

        // Đóng kết nối và thoát tiến trình
        sub.close();
        pool.close(RELAYS);
        process.exit(0);
      },
      oneose() {
        console.log('[Relay] Đã quét xong dữ liệu cũ, chờ event mới nổ...');
      },
    }
  );

  // Chờ 1 giây để WebSocket bắt tay xong với relay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 4. Tạo cấu trúc Event Kind 5000 chuẩn NIP-90
  const jobRequestTemplate = {
    kind: 5000,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['i', 'Xin chao day la text test NIP-90', 'text'], // Dữ liệu đầu vào
      ['output', 'text/plain'],                          // Định dạng đầu ra
      ['bid', '10000'],                                  // Giá trần: 10.000 msats (10 sats)
      ['relays', ...RELAYS],                             // Relay nhận phản hồi
      ['t', 'test-nostrpulse'],
    ],
    content: '',
  };

  // 5. Ký chữ ký số Schnorr
  const signedEvent = finalizeEvent(jobRequestTemplate, sk);
  console.log(`\n[NIP-01] Đã ký Schnorr thành công! Event ID: ${signedEvent.id}`);
  console.log(`[NIP-01] Signature: ${signedEvent.sig.slice(0, 32)}...`);

  // 6. Bắn event lên Relay
  console.log('[Relay] Đang phát tán event lên mạng Nostr...');
  try {
    await Promise.any(pool.publish(RELAYS, signedEvent));
    console.log('[Relay] Bắn event thành công! Đang chờ WebSocket dội ngược lại...');
  } catch (error) {
    console.error('[Error] Không thể publish tới relay:', error);
  }
}

runTest();
