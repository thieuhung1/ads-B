import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const RULES_DIR = path.resolve(ROOT_DIR, 'public', 'rules');

if (!fs.existsSync(RULES_DIR)) {
  fs.mkdirSync(RULES_DIR, { recursive: true });
}

const ALL_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'media',
  'websocket',
  'other'
];

/**
 * Top curated high-impact rules to guarantee 300-500 rules even offline
 */
const CURATED_EASYLIST_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'adservice.google.com',
  'pagead2.googlesyndication.com', 'adnxs.com', 'criteo.com', 'criteo.net', 'taboola.com',
  'outbrain.com', 'rubiconproject.com', 'pubmatic.com', 'openx.net', 'casalemedia.com',
  'smartadserver.com', 'bidswitch.net', 'moatads.com', 'advertising.com', 'yieldmo.com',
  'popads.net', 'popcash.net', 'propellerads.com', 'mgid.com', 'revcontent.com',
  'adroll.com', 'adblade.com', 'media.net', 'infolinks.com', 'chitika.com',
  'zergnet.com', 'sovrn.com', 'exponential.com', 'adform.net', 'teads.tv',
  'undertone.com', 'adcolony.com', 'unityads.unity3d.com', 'chartboost.com', 'applovin.com',
  'ironsrc.com', 'vungle.com', 'inmobi.com', 'admob.com', 'smaato.net',
  'spotxchange.com', 'spotx.tv', 'tremorhub.com', 'contextweb.com', 'yieldoptimizer.com',
  'adtechus.com', 'advertising.yahoo.com', 'adpushup.com', 'ezoic.net', 'mediavine.com',
  'adthrive.com', 'raptive.com', 'monetag.com', 'hilltopads.com', 'clickadu.com',
  'adsterra.com', 'richaudience.com', 'seedtag.com', 'gumgum.com', 'triplelift.com',
  'nativo.com', 'sharethrough.com', 'kargo.com', 'viantinc.com', 'invitemedia.com',
  'serving-sys.com', 'flashtalking.com', 'sizmek.com', 'adzerk.net', 'kevel.co',
  'adkernel.com', 'sonobi.com', 'unruly.co', 'brightroll.com', 'tremorvideo.com',
  'specificclick.net', 'steelhousemedia.com', 'quantcast.com', 'lijit.com', 'tribalfusion.com',
  'burstnet.com', 'zedo.com', 'fastclick.net', 'trafficjunky.com', 'exoclick.com',
  'ero-advertising.com', 'juicyads.com', 'plugrush.com', 'trafficfactory.biz', 'adx1.com',
  'adsupply.com', 'adcash.com', 'adbuffs.com', 'clicksor.com', 'bidvertiser.com',
  'ad-maven.com', 'yllix.com', 'clksite.com', 'adnetworkperformance.com', 'adf.ly',
  'shorte.st', 'linkbucks.com', 'coinurl.com', 'a-ads.com', 'coinhive.com',
  'admanmedia.com', 'adreactor.com', 'leadbolt.com', 'startapp.com', 'tapjoy.com',
  'fyber.com', 'mintegral.com', 'pangle.io', 'hyprmx.com', 'smaato.com',
  'loopme.com', 'ogury.co', 'ogury.io', 'verve.com', 'mobfox.com',
  'siprocal.com', 'bebi.com', 'clickio.com', 'setupad.com', 'snigelweb.com',
  'playwire.com', 'freestar.com', 'buysellads.com', 'carbonads.net', 'codefund.io',
  'ethicalads.io', 'influ2.com', 'demandbase.com', 'terminusplatform.com', 'rollworks.com',
  'metadata.io', '6sense.com', 'clearbit.com', 'zoominfo.com', 'leadfeeder.com',
  'albacross.com', 'snitcher.com', 'visitorqueue.com', 'factors.ai', 'warmly.ai',
  'usercentrics.eu', 'didomi.io', 'onetrust.com', 'cookiebot.com', 'quantserve.com',
  'scorecardresearch.com', 'effectivemeasure.net', 'gemius.pl', 'tns-counter.ru', 'webtrekk.net',
  'nedstatbasic.net', 'nedstat.com', 'sitestat.com', 'sensic.net', 'imrworldwide.com',
  'chartbeat.com', 'chartbeat.net', 'parsely.com', 'cxense.com', 'piano.io',
  'tinypass.com', 'evolok.net', 'poool.fr', 'qiota.com', 'adblockplus.org',
  'blockadblock.com', 'fuckadblock.net', 'adblock-analytics.com', 'pagefair.com', 'pagefair.net',
  'admiral.com', 'getadmiral.com', 'blockthrough.com', 'instartlogic.com', 'preventblock.com',
  'adrecovery.com', 'adguard.com', 'brave.com', 'eyeo.com', 'adreclaim.com',
  'revive-adserver.net', 'openx.com', 'epom.com', 'adbutler.com', 'broadstreetads.com',
  'adglare.com', 'advertserve.com', 'adserver.com', 'i-mobile.co.jp', 'microad.jp',
  'nend.net', 'ad-stir.com', 'geniee.co.jp', 'fluct.jp', 'kaizenplatform.com',
  'popin.cc', 'uzou.jp', 'logly.co.jp', 'bypass.jp', 'amoad.com'
];

const CURATED_EASYPRIVACY_DOMAINS = [
  'google-analytics.com', 'analytics.google.com', 'googletagmanager.com', 'googletagservices.com',
  'facebook.net', 'connect.facebook.net', 'pixel.facebook.com', 'tr.facebook.com',
  'hotjar.com', 'hotjar.io', 'mouseflow.com', 'crazyegg.com', 'fullstory.com',
  'logrocket.com', 'smartlook.com', 'luckyorange.com', 'inspectlet.com', 'vwo.com',
  'optimizely.com', 'abtasty.com', 'kameleoon.com', 'clarity.ms', 'c.bing.com',
  'bat.bing.com', 'yandex.ru/metrika', 'mc.yandex.ru', 'statcounter.com', 'mixpanel.com',
  'amplitude.com', 'heapanalytics.com', 'segment.com', 'segment.io', 'rudderstack.com',
  'posthog.com', 'plausible.io', 'matomo.org', 'fathomdns.com', 'count.ly',
  'adjust.com', 'appsflyer.com', 'branch.io', 'singular.net', 'kochava.com',
  'branch.link', 'app.link', 'tenjin.io', 'branchmetrics.com', 'sensortower.com',
  'appannie.com', 'data.ai', 'flurry.com', 'localytics.com', 'upsight.com',
  'leanplum.com', 'braze.com', 'onesignal.com', 'airship.com', 'clevertap.com',
  'moengage.com', 'webengage.com', 'customer.io', 'iterable.com', 'klaviyo.com',
  'intercom.io', 'drift.com', 'crisp.chat', 'livechatinc.com', 'tawk.to',
  'zendesk.com/embeddable', 'zopim.com', 'freshchat.com', 'olark.com', 'tidio.co',
  'bugsnag.com', 'sentry.io', 'rollbar.com', 'raygun.io', 'airbrake.io',
  'newrelic.com', 'nr-data.net', 'datadoghq.com', 'dynatrace.com', 'appdynamics.com',
  'pingdom.net', 'speedcurve.com', 'mulse.net', 'rum.fastly-insights.com', 'akamai-rum.net',
  'tiktok.com/i18n/pixel', 'analytics.tiktok.com', 'ads.tiktok.com', 'business-api.tiktok.com',
  'analytics.twitter.com', 'ads-twitter.com', 't.co', 'static.ads-twitter.com',
  'snapchat.com/tr', 'sc-static.net', 'tr.snapchat.com', 'ads.pinterest.com', 'ct.pinterest.com',
  'linkedin.com/px', 'snap.licdn.com', 'px.ads.linkedin.com', 'analytics.reddit.com',
  'alb.reddit.com', 'events.redditmedia.com', 'quora.com/_/ad', 'q.quora.com',
  'tumblr.com/analytics', 'analytics.yahoo.com', 'sp.analytics.yahoo.com', 'b.scorecardresearch.com',
  'sb.scorecardresearch.com', 'ar.voicefive.com', 'voicefive.com', 'cr-p.effectivemeasure.net',
  'survey.effectivemeasure.net', 'tns-cs.ru', 'counter.yadro.ru', 'top100.rambler.ru',
  'stat.weborama.fr', 'wborama.com', 'tag.aticdn.net', 'xiti.com', 'eulerian.net'
];

const CURATED_ABPVN_DOMAINS = [
  'eclick.vn', 's.eclick.vn', 'ad.eclick.vn', 'c.eclick.vn', 'media.eclick.vn',
  'ambientplatform.vn', 'admicro.vn', 'media1.admicro.vn', 'lg1.logging.admicro.vn',
  'adv.admicro.vn', 'admicro1.vcmedia.vn', 'static.admicro.vn', 'ants.vn', 'delivery.ants.vn',
  'ad.ants.vn', 'track.ants.vn', 'static.ants.vn', 'vietad.vn', 'vietad.com.vn',
  'novanet.vn', 'ads.novanet.vn', 'blueseed.tv', 'tracking.blueseed.tv', 'adp.blueseed.tv',
  'adtimabox.vn', 'adtima.vn', 'api.adtima.vn', 'ad.adtima.vn', 'media.adtima.vn',
  'fptads.com', 'ads.fpt.vn', 'ad.24h.com.vn', 'adv.24h.com.vn', 'tracking.24h.com.vn',
  'banner.24h.com.vn', 'ads.dantri.com.vn', 'adv.dantri.com.vn', 'ad.vnexpress.net',
  'adservice.vnexpress.net', 'log.vnexpress.net', 'tracking.vnexpress.net', 'ads.kenh14.vn',
  'ads.cafef.vn', 'ads.cafebiz.vn', 'ads.genk.vn', 'ads.soha.vn', 'ads.tuoitre.vn',
  'ad.thanhnien.vn', 'ads.zingnews.vn', 'ads.zing.vn', 'tracking.zing.vn', 'zads.vn',
  'ad.tinhte.vn', 'ads.vietnamnet.vn', 'adserver.vietnamnet.vn', 'ads.laodong.vn',
  'ads.vov.vn', 'ads.vtv.vn', 'ads.tienphong.vn', 'quangcao.24h.com.vn', 'qc.tinhte.vn',
  'microad.vn', 'inveniamedia.vn', 'innity.com', 'innity.net', 'media.innity.net',
  'ambient-digital.com', 'ambientplatform.com', 'cleverads.vn', 'clevernet.vn',
  'gapit.com.vn', 'adnow.com', 'mgid.vn', 'vietclick.vn', 'admeta.vn',
  'adflex.vn', 'accesstrade.vn/track', 'adpia.vn/track', 'masoffer.com/track',
  'ecomobi.com/track', 'dkt.com.vn', 'bizweb.vn/track', 'sapo.vn/analytics',
  'haravan.com/analytics', 'subiz.com', 'fchat.vn', 'vchat.vn', 'zalo.me/analytics',
  'sp.zalo.me', 'tracking.zalo.me', 'log.zalo.me', 'ads.zalo.me', 'page.widget.zalo.me'
];

/**
 * Convert a clean domain to a standard declarativeNetRequest rule
 */
function createDnrRule(id, domain, source) {
  return {
    id,
    priority: 1,
    action: {
      type: 'block'
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ALL_RESOURCE_TYPES
    }
  };
}

/**
 * Attempt to fetch remote ABP list and extract network domains
 */
async function fetchAndExtractDomains(url, maxCount = 200) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split('\n');

    const domains = new Set();
    const regex = /^\|\|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\^?(\$.*)?$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('!') || line.startsWith('[')) continue;
      if (line.includes('##') || line.includes('#@#') || line.includes('#?#')) continue;
      if (line.startsWith('@@')) continue; // skip exceptions for now

      const match = line.match(regex);
      if (match && match[1]) {
        const d = match[1].toLowerCase();
        if (!d.includes('*') && d.length > 4 && d.includes('.')) {
          domains.add(d);
          if (domains.size >= maxCount) break;
        }
      }
    }
    return Array.from(domains);
  } catch (err) {
    console.warn(`[WARN] Không thể tải từ ${url} (${err.message}). Sử dụng danh sách curated dự phòng.`);
    return [];
  }
}

async function build() {
  console.log('🚀 Bắt đầu build DeclarativeNetRequest Rulesets cho BlockAds 2.0...\n');

  // 1. EasyList
  console.log('📥 Đang xử lý EasyList...');
  const remoteEasyList = await fetchAndExtractDomains('https://easylist.to/easylist/easylist.txt', 250);
  const combinedEasyList = Array.from(new Set([...CURATED_EASYLIST_DOMAINS, ...remoteEasyList])).slice(0, 220);
  let idCounter = 1000;
  const easyListRules = combinedEasyList.map(domain => createDnrRule(++idCounter, domain, 'easylist'));

  // 2. EasyPrivacy
  console.log('📥 Đang xử lý EasyPrivacy...');
  const remoteEasyPrivacy = await fetchAndExtractDomains('https://easylist.to/easylist/easyprivacy.txt', 200);
  const combinedEasyPrivacy = Array.from(new Set([...CURATED_EASYPRIVACY_DOMAINS, ...remoteEasyPrivacy])).slice(0, 160);
  idCounter = 3000;
  const easyPrivacyRules = combinedEasyPrivacy.map(domain => createDnrRule(++idCounter, domain, 'easyprivacy'));

  // 3. ABPVN (Việt Nam) + Chặn Cờ Bạc & Bypass Anti-Adblock (9001 - 9008)
  console.log('📥 Đang xử lý ABPVN & Gambling Adblock...');
  const remoteAbpvn = await fetchAndExtractDomains('https://raw.githubusercontent.com/abpvn/abpvn/master/filter/abpvn.txt', 150);
  const combinedAbpvn = Array.from(new Set([...CURATED_ABPVN_DOMAINS, ...remoteAbpvn])).slice(0, 120);
  idCounter = 5000;
  const standardAbpvnRules = combinedAbpvn.map(domain => createDnrRule(++idCounter, domain, 'abpvn'));

  const gamblingAndAntiAdblockRules = [
    {
      id: 9001,
      priority: 20,
      action: { type: 'block' },
      condition: {
        urlFilter: '*vsbet*',
        resourceTypes: ['image', 'sub_frame', 'script', 'xmlhttprequest', 'media']
      }
    },
    {
      id: 9002,
      priority: 20,
      action: { type: 'block' },
      condition: {
        urlFilter: '*vivu88*',
        resourceTypes: ['image', 'sub_frame', 'script', 'xmlhttprequest', 'media']
      }
    },
    {
      id: 9003,
      priority: 20,
      action: { type: 'block' },
      condition: {
        urlFilter: '*rikvip*',
        resourceTypes: ['image', 'sub_frame', 'script', 'xmlhttprequest', 'media']
      }
    },
    {
      id: 9004,
      priority: 20,
      action: { type: 'block' },
      condition: {
        urlFilter: '*nhatvip*',
        resourceTypes: ['image', 'sub_frame', 'script', 'xmlhttprequest', 'media']
      }
    },
    {
      id: 9005,
      priority: 20,
      action: { type: 'block' },
      condition: {
        regexFilter: '.*(go88|sunwin|b52club|789club|hitclub|kubet|f8bet|shbet|hi88|new88|jun88|mb66|ok9|8xbet|188bet|w88|m88|fb88|fun88|vn88|dafabet|bk8|cmd368).*',
        resourceTypes: ['image', 'sub_frame', 'script', 'xmlhttprequest']
      }
    },
    {
      id: 9006,
      priority: 50,
      action: { type: 'allow' },
      condition: {
        initiatorDomains: ['animevietsub.nl', 'animevietsub.tv', 'animevietsub.io', 'animevietsub.cc'],
        urlFilter: '||pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        resourceTypes: ['script', 'xmlhttprequest']
      }
    },
    {
      id: 9007,
      priority: 20,
      action: { type: 'block' },
      condition: {
        urlFilter: '*blockadblock*',
        resourceTypes: ['script']
      }
    },
    {
      id: 9008,
      priority: 20,
      action: { type: 'block' },
      condition: {
        urlFilter: '*fuckadblock*',
        resourceTypes: ['script']
      }
    }
  ];

  const abpvnRules = [...standardAbpvnRules, ...gamblingAndAntiAdblockRules];

  // Lưu file JSON
  const easylistPath = path.join(RULES_DIR, 'ruleset-easylist.json');
  const easyprivacyPath = path.join(RULES_DIR, 'ruleset-easyprivacy.json');
  const abpvnPath = path.join(RULES_DIR, 'ruleset-abpvn.json');

  fs.writeFileSync(easylistPath, JSON.stringify(easyListRules, null, 2), 'utf-8');
  fs.writeFileSync(easyprivacyPath, JSON.stringify(easyPrivacyRules, null, 2), 'utf-8');
  fs.writeFileSync(abpvnPath, JSON.stringify(abpvnRules, null, 2), 'utf-8');

  const totalRules = easyListRules.length + easyPrivacyRules.length + abpvnRules.length;

  console.log('\n✅ Tạo ruleset thành công:');
  console.log(`  1. EasyList      : ${easyListRules.length} rules -> ${path.relative(ROOT_DIR, easylistPath)}`);
  console.log(`  2. EasyPrivacy   : ${easyPrivacyRules.length} rules -> ${path.relative(ROOT_DIR, easyprivacyPath)}`);
  console.log(`  3. ABPVN         : ${abpvnRules.length} rules -> ${path.relative(ROOT_DIR, abpvnPath)}`);
  console.log(`  🌟 TỔNG SỐ RULES : ${totalRules} rules chuẩn Declarative Net Request MV3!`);
}

build().catch(err => {
  console.error('❌ Lỗi khi build rulesets:', err);
  process.exit(1);
});
