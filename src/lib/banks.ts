export interface BankTemplate {
  name: string;
  color: string; // brand color for monogram
}

export const BANK_CATALOG: BankTemplate[] = [
  // Russia
  { name: 'Сбербанк', color: '#21A038' },
  { name: 'T-Банк', color: '#FFDD2D' },
  { name: 'Тинькофф', color: '#FFDD2D' },
  { name: 'ВТБ', color: '#003087' },
  { name: 'Альфа-Банк', color: '#EF3124' },
  { name: 'Газпромбанк', color: '#00569B' },
  { name: 'Россельхозбанк', color: '#43B02A' },
  { name: 'МТС Банк', color: '#E30611' },
  { name: 'Почта Банк', color: '#0073CF' },
  { name: 'Совкомбанк', color: '#FF6B00' },
  { name: 'Росбанк', color: '#C8003A' },
  { name: 'Открытие', color: '#F37021' },
  { name: 'Промсвязьбанк', color: '#F1781A' },
  { name: 'Райффайзен', color: '#FFE500' },
  { name: 'Ренессанс Кредит', color: '#00A2E9' },
  { name: 'ОТП Банк', color: '#004A97' },
  { name: 'Хоум Кредит', color: '#CC0000' },
  { name: 'Уралсиб', color: '#00409A' },
  { name: 'Ак Барс', color: '#009A44' },
  { name: 'РНКБ', color: '#005A9C' },
  { name: 'Банк Дом.РФ', color: '#0046A8' },
  { name: 'Абсолют Банк', color: '#005CA9' },
  { name: 'БКС Банк', color: '#00529B' },
  { name: 'Экспобанк', color: '#005B9A' },
  { name: 'Хлынов', color: '#008C45' },
  // Belarus
  { name: 'Беларусбанк', color: '#006BB6' },
  { name: 'Белинвестбанк', color: '#0057A8' },
  { name: 'БелВЭБ', color: '#003F7D' },
  // Kazakhstan
  { name: 'Халык Банк', color: '#00AEEF' },
  { name: 'Каспи', color: '#FF6900' },
  { name: 'BCC', color: '#005BAA' },
  { name: 'Forte Bank', color: '#003087' },
  // Ukraine
  { name: 'monobank', color: '#403F3F' },
  { name: 'PrivatBank', color: '#00A64F' },
  { name: 'OTP Bank', color: '#004A97' },
  // Armenia / Georgia
  { name: 'Ардшинбанк', color: '#DA291C' },
  { name: 'TBC Bank', color: '#00A3DE' },
  { name: 'Bank of Georgia', color: '#CC0000' },
];

export function searchBanks(query: string): BankTemplate[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  return BANK_CATALOG
    .filter((b) => b.name.toLowerCase().startsWith(q) || b.name.toLowerCase().includes(q))
    .slice(0, 6);
}
