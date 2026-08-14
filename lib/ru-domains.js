// Pure data module — no chrome.* APIs allowed.
//
// Built-in catalogue of Russian services, grouped by category. Used by pac.js
// to force these hosts DIRECT (bypassing whatever proxy/VPN is configured),
// and by the popup to render the "RU-сервисы" tab.
//
// Domains are matched by suffix (same dnsDomainIs semantics as everywhere
// else in this codebase), so a root domain like "yandex.ru" automatically
// covers every subdomain (mail.yandex.ru, market.yandex.ru, ...).
//
// This list is necessarily a best-effort snapshot, not exhaustive — the
// popup's "Добавить свой RU-сайт" field lets users extend it themselves.

export const RU_CATEGORIES = [
  {
    id: 'banks',
    label: 'Банки и финансы',
    labelEn: 'Banks & Finance',
    icon: '🏦',
    domains: [
      'sberbank.ru', 'sber.ru', 'alfabank.ru', 'tbank.ru', 'tinkoff.ru',
      'vtb.ru', 'gazprombank.ru', 'raiffeisen.ru', 'rosbank.ru',
      'otkritie.ru', 'sovcombank.ru', 'psbank.ru', 'rshb.ru', 'mkb.ru',
      'uralsib.ru', 'homecredit.ru', 'pochtabank.ru', 'yoomoney.ru',
      'qiwi.com', 'mironline.ru', 'nspk.ru', 'cbr.ru', 'moex.com',
      'domclick.ru', 'akbars.ru', 'bspb.ru',
    ],
  },
  {
    id: 'marketplaces',
    label: 'Маркетплейсы и магазины',
    labelEn: 'Marketplaces & Retail',
    icon: '🛒',
    domains: [
      'wildberries.ru', 'wb.ru', 'ozon.ru', 'megamarket.ru',
      'aliexpress.ru', 'lamoda.ru', 'dns-shop.ru', 'citilink.ru',
      'mvideo.ru', 'eldorado.ru', 'leroymerlin.ru', 'detmir.ru',
      'letu.ru', 'goldapple.ru', 'vseinstrumenti.ru', 'utkonos.ru',
      'avito.ru', 'youla.ru', 'cian.ru', 'petrovich.ru',
    ],
  },
  {
    id: 'yandex',
    label: 'Яндекс (все сервисы)',
    labelEn: 'Yandex (all products)',
    icon: 'Я',
    domains: [
      'yandex.ru', 'yandex.com', 'yandex.net', 'yastatic.net', 'ya.ru',
      'kinopoisk.ru', 'dzen.ru', 'yadi.sk', 'yandexcloud.net',
    ],
  },
  {
    id: 'vk',
    label: 'VK / Mail.ru',
    labelEn: 'VK / Mail.ru',
    icon: '👥',
    domains: [
      'vk.com', 'vk.ru', 'ok.ru', 'mail.ru', 'vkplay.ru', 'vkvideo.ru',
      'userapi.com', 'vk-cdn.net',
    ],
  },
  {
    id: 'gosuslugi',
    label: 'Госуслуги и госорганы',
    labelEn: 'Government services',
    icon: '🏛️',
    domains: [
      'gosuslugi.ru', 'mos.ru', 'nalog.ru', 'nalog.gov.ru', 'sfr.gov.ru',
      'pfr.gov.ru', 'rosreestr.gov.ru', 'gibdd.ru', 'mvd.ru', 'kremlin.ru',
      'government.ru', 'duma.gov.ru', 'minfin.gov.ru', 'minzdrav.gov.ru',
      'rospotrebnadzor.ru', 'fss.ru',
    ],
  },
  {
    id: 'telecom',
    label: 'Операторы связи',
    labelEn: 'Telecom',
    icon: '📶',
    domains: ['mts.ru', 'beeline.ru', 'megafon.ru', 'tele2.ru', 'rt.ru', 'yota.ru'],
  },
  {
    id: 'delivery',
    label: 'Доставка и еда',
    labelEn: 'Delivery & Food',
    icon: '🚚',
    domains: ['samokat.ru', 'sbermarket.ru', 'kuper.ru', 'vprok.ru', 'pochta.ru', 'ems.ru'],
  },
  {
    id: 'media',
    label: 'СМИ и медиа',
    labelEn: 'Media & News',
    icon: '📰',
    domains: [
      'rbc.ru', 'lenta.ru', 'ria.ru', 'tass.ru', 'kommersant.ru',
      'vedomosti.ru', '1tv.ru', 'ntv.ru', 'ren.tv', 'gazeta.ru',
      'interfax.ru', 'rt.com', 'fontanka.ru', 'sport-express.ru',
      'championat.com',
    ],
  },
  {
    id: 'streaming',
    label: 'Онлайн-кинотеатры',
    labelEn: 'Streaming',
    icon: '🎬',
    domains: ['ivi.ru', 'okko.tv', 'start.ru', 'more.tv', 'premier.one', 'wink.ru', 'amediateka.ru'],
  },
  {
    id: 'jobs',
    label: 'Работа',
    labelEn: 'Jobs',
    icon: '💼',
    domains: ['hh.ru', 'superjob.ru', 'rabota.ru'],
  },
  {
    id: 'transport',
    label: 'Транспорт и путешествия',
    labelEn: 'Transport & Travel',
    icon: '✈️',
    domains: [
      'rzd.ru', 'aeroflot.ru', 's7.ru', 'pobeda.aero', 'utair.ru',
      'tutu.ru', '2gis.ru', 'rutube.ru',
    ],
  },
  {
    id: 'other',
    label: 'Другое',
    labelEn: 'Other',
    icon: '🔹',
    domains: ['habr.com'],
  },
];

export const RU_DOMAINS_FLAT = [...new Set(RU_CATEGORIES.flatMap((c) => c.domains))];

export function totalRuDomainCount() {
  return RU_DOMAINS_FLAT.length;
}
