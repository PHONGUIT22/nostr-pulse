import { SimplePool, nip19 } from "nostr-tools";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Curated seed npubs
const RAW_NPUBS = [
  "npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s",
  "npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m",
  "npub1j8y6tcdfw3q3f3h794s6un0gyc5742s0k5h5s2yqj0r70cpklqeqjavrvg",
  "npub1csamkk8zu67zl9z4wkp90a462v53q775aqn5q6xzjdkxnkvcpd7srtz4x9",
  "npub1qqqqqqyz0la2jjl752yv8h7wgs3v098mh9nztd4nr6gynaef6uqqt0n47m",
  "npub1qny3tkh0acurzla8x3zy4nhrjz5zd8l9sy9jys09umwng00manysew95gx",
  "npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc",
  "npub1y24gz5gwucl79vtv4ctwpysl0r5m4xyzu2rgulnr44ks3t5mt92q4nz2ad",
  "npub1z4m7gkva6yxgvdyclc7zp0vz4ta0s2d9jh8g83w03tp5vdf3kzdsxana6p",
  "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6",
  "npub18ams6ewn5aj2n3wt2qawzglx9mr4nzksxhvrdc4gzrecw7n5tvjqctp424",
  "npub107jk7htfv243u0x5ynn43scq9wrxtaasmrwwa8lfu2ydwag6cx2quqncxg",
  "npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9",
  "npub1s5yq6wadwrxde4lhfs56gn64hwzuhnfa6r9mj476r5s4hkunzgzqrs6q7z",
  "npub1lrnvvs6z78s9yjqxxr38uyqkmn34lsaxznnqgd877j4z2qej3j5s09qnw5",
  "npub1tvqc82mv8cezhax5r34n4muc2c4pgjz8kaye2smj032nngg52clq0rkrq4",
  "npub1cj8znuztfqkvq89pl8hceph0svvvqk0qay6nydgk9uyq7fhpfsgsqwrz4u",
  "npub1hu3hdctm5nkzd8gslnyedfr5ddz3z547jqcl5j88g4fame2jd08qh6h8nh",
  "npub16vrkgd28wq6n0h77lqgu8h4fdu0eapxgyj0zqq6ngfvjf2vs3nuq5mp2va",
  "npub1a2cww4kn9wqte4ry70vyfwqyqvpswksna27rtxd8vty6c74era8sdcw83a",
  "npub1gcxzte5zlkncx26j68ez60fzkvtkm9e0vrwdcvsjakxf9mu9qewqlfnj5z",
  "npub1cjw49ftnxene9wdxujz3tp7zspp0kf862cjud4nm3j2usag6eg2smwj2rh",
  "npub1sqaxzwvh5fhgw9q3d7v658ucapvfeds3dcd2587fcwyesn7dnwuqt2r45v",
  "npub1jt0x3vsnqtazzda3ewa8ykdch2t8k566qhrd9vyy0k0ntleu744q8h6q3n",
  "npub1cn4t4cd78nm900qc2hhqte5aa8c9njm6qkfzw95tszufwcwtcnsq7g3vle",
  "npub1teawtzxh6y02cnp9jphxm2q8u6xxfx85nguwg6ftuksgjctvavvqnsgq5u"
];

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.nostr.band"
];

// Verifies if Lightning endpoint (lud16) returns a valid callback
async function verifyLightningAddress(lud16) {
  if (!lud16 || !lud16.includes("@")) return "";
  const [user, domain] = lud16.split("@");
  if (!user || !domain) return "";
  try {
    const res = await fetch(`https://${domain.trim()}/.well-known/lnurlp/${encodeURIComponent(user.trim())}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.callback) return lud16.trim();
    }
  } catch {}
  return "";
}

async function run() {
  console.log("⚡ Đang kết nối WebSocket đến 4 Relays để kéo Metadata (Kind 0)...");
  const pool = new SimplePool();
  const hexMap = new Map();
  const hexKeys = [];

  for (const npub of RAW_NPUBS) {
    try {
      const decoded = nip19.decode(npub);
      if (decoded.type === "npub") {
        hexKeys.push(decoded.data);
        hexMap.set(decoded.data, npub);
      }
    } catch {}
  }

  // Query Kind 0 metadata events for all target authors
  const events = await pool.querySync(RELAYS, {
    kinds: [0],
    authors: hexKeys
  });

  console.log(` Nhận được ${events.length} metadata events từ mạng lưới.`);

  // Deduplicate and retain latest event per pubkey (by created_at)
  const latestEvents = new Map();
  for (const ev of events) {
    const existing = latestEvents.get(ev.pubkey);
    if (!existing || ev.created_at > existing.created_at) {
      latestEvents.set(ev.pubkey, ev);
    }
  }

  const enrichedCreators = [];

  for (const hex of hexKeys) {
    const ev = latestEvents.get(hex);
    const npub = hexMap.get(hex);

    if (ev && ev.content) {
      try {
        const meta = JSON.parse(ev.content);
        const rawLud16 = meta.lud16 || meta.lud06 || "";
        const validLud16 = await verifyLightningAddress(rawLud16);

        const name = meta.display_name || meta.displayName || meta.name || `Nostr User`;
        const handle = meta.name || npub.slice(0, 10);

        enrichedCreators.push({
          name: name.slice(0, 35),
          handle: handle.slice(0, 25),
          npub: npub,
          pubkey: hex,
          score: validLud16 && meta.nip05 ? 96 : meta.nip05 ? 88 : 75,
          zapsReceived: validLud16 ? "Active Node" : "0 Sats",
          picture: meta.picture || meta.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${npub}`,
          about: meta.about || meta.bio || "Active Nostr builder and creator.",
          nip05: meta.nip05 || "",
          lud16: validLud16
        });

        console.log(` ${name} (@${handle}) -> Ví Lightning: ${validLud16 || "Chưa cấu hình"}`);
      } catch (err) {
        console.warn(`Lỗi parse metadata của ${hex.slice(0, 8)}`);
      }
    }
  }

  pool.close(RELAYS);

  const outputPath = fileURLToPath(new URL("../lib/creators.json", import.meta.url));
  fs.writeFileSync(outputPath, JSON.stringify(enrichedCreators, null, 2), "utf-8");
  console.log(`\n🎉 Hoàn tất! Đã ghi ${enrichedCreators.length} profile thật 100% vào ${outputPath}`);
  process.exit(0);
}

run();