/**
 * "How to cancel" links for subscriptions.
 *
 * CANCEL_URLS holds ONLY verified official cancel/manage pages, keyed by the
 * exact service name from lib/services.ts (case-insensitive). A wrong URL is
 * worse than none, so unverified services are intentionally left out — they
 * fall back to a web search, which is always correct.
 *
 * Populated from verified research (see getCancelLink).
 */
const CANCEL_URLS: Record<string, string> = {
  // Keys are lowercased exact catalog names. Only high-confidence verified
  // official pages are listed here (research 2026-05); everything else falls
  // back to a web search.

  // ── Streaming ──
  'netflix': 'https://www.netflix.com/cancelplan',
  'youtube premium': 'https://support.google.com/youtube/answer/6308278',
  'disney+': 'https://help.disneyplus.com/article/disneyplus-cancel',
  'hbo max': 'https://help.max.com/us-en/Answer/Detail/000002526',
  'apple tv+': 'https://support.apple.com/en-us/118398',
  'crunchyroll': 'https://help.crunchyroll.com/hc/en-us/articles/17931128982164-How-do-I-cancel-my-membership',
  'twitch': 'https://www.twitch.tv/settings/subscriptions',
  'hulu': 'https://help.hulu.com/article/hulu-cancel-hulu-subscription',
  'paramount+': 'https://help.paramountplus.com/s/article/PD-How-can-I-cancel-my-Paramount-subscription',
  'peacock': 'https://www.peacocktv.com/help/article/cancellation',
  'иви': 'https://ask.ivi.ru/knowledge-bases/10/articles/41564-kak-otmenit-avtomaticheskoe-prodlenie-podpiski-cherez-sajt',
  'okko': 'https://help.okko.tv/subs/cancel',
  'wink': 'https://wink.ru/faq/102',

  // ── Music ──
  'spotify': 'https://support.spotify.com/us/article/cancel-premium/',
  'apple music': 'https://support.apple.com/en-us/118399',
  'яндекс музыка': 'https://yandex.ru/support/music/users/cancel-subscription.html',
  'звук': 'https://help.zvuk.com/article/42230',
  'tidal': 'https://support.tidal.com/hc/en-us/articles/201314601-Cancel-Tidal-Subscription-or-Trial',
  'deezer': 'https://support.deezer.com/hc/en-gb/articles/214349245-Cancel-Your-Deezer-Subscription',
  'soundcloud go': 'https://help.soundcloud.com/hc/en-us/articles/360056011234-Cancel-your-subscription',
  'amazon music': 'https://music.amazon.com/help?nodeId=G202196870',
  'youtube music': 'https://support.google.com/youtube/answer/6308278',

  // ── Software / Productivity ──
  'microsoft 365': 'https://support.microsoft.com/en-us/office/cancel-a-microsoft-365-subscription-46e2634c-c64b-4c65-94b9-2cc9c960e91b',
  'adobe creative cloud': 'https://helpx.adobe.com/account/individual/subscriptions-and-plans/renewals-and-cancellations/cancel-adobe-subscription.html',
  'figma': 'https://help.figma.com/hc/en-us/articles/360046216313-Upgrade-or-downgrade-your-plan',
  'notion': 'https://www.notion.com/help/upgrade-or-downgrade-your-plan',
  'todoist': 'https://www.todoist.com/help/articles/cancel-a-todoist-subscription-08AmJLVkC',
  '1password': 'https://support.1password.com/manage-subscription/',
  'canva pro': 'https://www.canva.com/help/cancel-canva-plan/',
  'slack': 'https://slack.com/help/articles/48764458651795-Change-or-cancel-your-paid-Slack-plan',
  'zoom': 'https://support.zoom.us/hc/en-us/articles/203634215-How-Do-I-Cancel-My-Subscription-',
  'github pro': 'https://docs.github.com/en/billing/managing-the-plan-for-your-github-account/downgrading-your-accounts-plan',
  'grammarly': 'https://support.grammarly.com/hc/en-us/articles/115000090172-How-do-I-cancel-my-subscription',
  'linear': 'https://linear.app/docs/billing-and-plans',
  'trello': 'https://support.atlassian.com/trello/docs/change-or-cancel-your-trello-plan/',
  'asana': 'https://help.asana.com/s/article/how-to-cancel-your-asana-plan?language=en_US',
  'miro': 'https://help.miro.com/hc/en-us/articles/360011986179-Cancel-your-Miro-subscription',
  'setapp': 'https://support.setapp.com/hc/en-us/articles/214288385-Cancel-subscription',
  'x premium': 'https://help.x.com/en/using-x/x-premium-faq',
  'linkedin premium': 'https://www.linkedin.com/help/linkedin/answer/a545578',
  'airtable': 'https://support.airtable.com/docs/how-to-cancel-delete-your-account',
  'loom': 'https://support.loom.com/hc/en-us/articles/360002244518-How-to-downgrade-cancel-your-Loom-plan',
  'jetbrains': 'https://sales.jetbrains.com/hc/en-gb/articles/16269809436690-Cancel-a-personal-subscription',
  'webflow': 'https://help.webflow.com/hc/en-us/articles/33961220482707-Downgrade-or-cancel-your-Site-plan',
  'clickup': 'https://help.clickup.com/hc/en-us/articles/13673035695127-Downgrade-your-plan',
  'monday.com': 'https://support.monday.com/hc/en-us/articles/360018133779-How-to-cancel-and-close-your-account',
  'bitwarden': 'https://bitwarden.com/help/cancel-a-subscription/',

  // ── Cloud storage ──
  'icloud+': 'https://support.apple.com/en-us/108318',
  'google one': 'https://support.google.com/googleone/answer/9056360',
  'dropbox plus': 'https://help.dropbox.com/plans/downgrade-dropbox-individual-plans',
  'onedrive': 'https://support.microsoft.com/en-us/account-billing/cancel-your-microsoft-subscription-c2c6b0e3-cab3-cb98-d83e-c9ad54620530',
  'box': 'https://support.box.com/hc/en-us/articles/360043694874-Canceling-Your-Box-Account',
  'pcloud': 'https://www.pcloud.com/help/general-help-center/how-do-i-cancel-my-subscription',
  'mail.ru облако': 'https://help.mail.ru/cloud/faq/subscription/cancel/',

  // ── Games ──
  'playstation plus': 'https://www.playstation.com/en-us/support/subscriptions/cancel-playstation-plus/',
  'xbox game pass': 'https://support.xbox.com/en-US/help/subscriptions-billing/manage-subscriptions/cancel-recurring-billing-or-subscription',
  'nintendo switch online': 'https://en-americas-support.nintendo.com/app/answers/detail/a_id/41196',
  'ea play': 'https://www.ea.com/manage-membership/cancel',
  'geforce now': 'https://nvidia.custhelp.com/app/answers/detail/a_id/4980',
  'ubisoft+': 'https://www.ubisoft.com/en-us/help/ubisoft-plus/purchases-and-rewards/article/cancelling-your-ubisoft-subscription/000065286',
  'apple arcade': 'https://support.apple.com/en-us/118428',
  'roblox premium': 'https://en.help.roblox.com/hc/en-us/articles/360024256251-Roblox-Premium-Membership',

  // ── Learning ──
  'duolingo plus': 'https://www.duolingo.com/help/cancel-my-super-duolingo-subscription',
  'coursera plus': 'https://learner.coursera.help/hc/en-us/articles/216348123-Cancel-a-subscription',
  'leetcode premium': 'https://support.leetcode.com/hc/en-us/articles/360011984633-How-to-cancel-my-premium-subscription',
  'masterclass': 'https://www.masterclass.com/help-center/masterclass/answers/cancelling-your-subscription-renewal--id--M2McWBvNTh-WNRR6llmkAw',
  'udemy': 'https://support.udemy.com/hc/en-us/articles/1500002916481-How-to-manage-your-Udemy-subscriptions',
  'skillshare': 'https://help.skillshare.com/hc/en-us/articles/115001701651-How-do-I-cancel-my-Skillshare-membership',
  'pluralsight': 'https://help.pluralsight.com/hc/en-us/articles/24357203231508-Canceling-an-individual-subscription',
  'babbel': 'https://support.babbel.com/hc/en-us/articles/205600298-Canceling-a-subscription',

  // ── AI ──
  'chatgpt plus': 'https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-subscription-for-chatgpt-plus-or-chatgpt-pro',
  'claude pro': 'https://support.anthropic.com/en/articles/8325617-how-do-i-cancel-my-claude-pro-subscription',
  'midjourney': 'https://docs.midjourney.com/hc/en-us/articles/25384024738573-Canceling-Your-Subscription',
  'github copilot': 'https://docs.github.com/en/copilot/how-tos/manage-your-account/view-and-change-your-copilot-plan',
  'cursor pro': 'https://cursor.com/help/account-and-billing/cancel',
  'runway': 'https://help.runwayml.com/hc/en-us/articles/21668396605971-How-do-I-cancel-my-plan',
  'elevenlabs': 'https://help.elevenlabs.io/hc/en-us/articles/24489536934673-How-do-I-downgrade-or-cancel-my-subscription',
  'gemini advanced': 'https://support.google.com/gemini/answer/14517446',
  'copilot pro': 'https://support.microsoft.com/en-us/account-billing/cancel-a-copilot-pro-subscription-ec3698b0-cdac-4f50-a4a6-c998a02960f1',
  'deepl pro': 'https://support.deepl.com/hc/en-us/articles/360020723719-Cancel-subscription',

  // ── VPN / Security ──
  'nordvpn': 'https://support.nordvpn.com/hc/en-us/articles/19556844985489-How-to-cancel-auto-renewal-for-your-NordVPN-subscription',
  'expressvpn': 'https://www.expressvpn.com/support/manage-account/cancel-expressvpn-subscription/',
  'surfshark': 'https://support.surfshark.com/hc/en-us/articles/360003069694-How-to-cancel-auto-renewal-for-your-Surfshark-subscription',
  'protonvpn': 'https://protonvpn.com/support/cancel-vpn-subscription',
  'proton unlimited': 'https://proton.me/support/manage-subscription',
  'norton': 'https://support.norton.com/sp/en/us/home/current/solutions/kb20100113164023EN',

  // ── Other subscriptions ──
  'amazon prime': 'https://www.amazon.com/gp/help/customer/display.html?nodeId=GTJQ7QZY7QL2HK4Y',
  'ozon premium': 'https://www.ozon.ru/club/article/kak-otklyuchit-ozon-premium-474977/',
  'telegram premium': 'https://telegram.org/faq_premium',
  'discord nitro': 'https://support.discord.com/hc/en-us/articles/19580873036695-How-to-Cancel-your-Nitro-Subscription',
  'apple one': 'https://support.apple.com/en-us/118428',
  'patreon': 'https://support.patreon.com/hc/en-us/articles/360005502572-Canceling-a-paid-membership',
  'strava': 'https://support.strava.com/hc/en-us/articles/216918927-How-to-Cancel-your-Subscription',
  'headspace': 'https://help.headspace.com/hc/en-us/articles/115008364988-How-do-I-cancel-my-subscription',
  'calm': 'https://support.calm.com/hc/en-us/articles/115002473607-How-to-Cancel-Your-Subscription-or-Free-Trial',
  'myfitnesspal': 'https://support.myfitnesspal.com/hc/en-us/articles/360032625371-How-do-I-cancel-my-Premium-subscription-renewal',
  'audible': 'https://help.audible.com/s/article/cancel-membership?language=en_US',
  'литрес': 'https://support.litres.ru/hc/ru/articles/360016274640',
  'storytel': 'https://support.storytel.com/hc/en-001/articles/360010486719-Cancel-your-subscription',
};

function norm(name: string): string {
  return name.trim().toLowerCase();
}

export function getOfficialCancelUrl(name: string): string | undefined {
  return CANCEL_URLS[norm(name)];
}

export interface CancelLink {
  url: string;
  /** true = verified official cancel/manage page; false = user link or web search */
  official: boolean;
}

/**
 * Best "how to cancel" link for a subscription, in priority order:
 *  1. a verified official cancel/manage page (if we have one),
 *  2. the management URL the user saved (already sanitized by the caller),
 *  3. a web search — always correct, never a wrong instruction.
 */
export function getCancelLink(name: string, managementUrl?: string): CancelLink {
  const official = getOfficialCancelUrl(name);
  if (official) return { url: official, official: true };

  if (managementUrl && managementUrl.trim()) {
    return { url: managementUrl.trim(), official: false };
  }

  const q = encodeURIComponent(`how to cancel ${name} subscription`);
  return { url: `https://www.google.com/search?q=${q}`, official: false };
}
