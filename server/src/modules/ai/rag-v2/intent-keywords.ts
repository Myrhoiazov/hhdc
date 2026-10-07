import type { AliasTable } from '../../knowledge/kb-v2';

// EN / RU / UK / NL keyword prefixes per intent, matched as word prefixes so case endings resolve
// without a stemmer. Table ORDER is the tie-break when the classifier gave nothing usable: the
// most consequential topics (complaints, money, actions) win over generic ones.
export const INTENT_KEYWORDS: AliasTable = {
    complaint: ['unacceptable', 'complaint', 'complain', 'disappointed', 'nobody answers', 'жалоб', 'недовольн', 'возмутительн', 'никто не отвеча', 'скарг', 'незадовол', 'klacht', 'ontevreden', 'onacceptabel'],
    refund: ['refund', 'money back', 'refundable', 'возврат', 'вернуть деньги', 'вернуть оплат', 'повернен', 'повернути кошти', 'terugbetal', 'geld terug', 'restitutie'],
    cancellation: ['cancel', 'отмен', 'аннулир', 'скасув', 'annuler', 'opzeg'],
    payment: ['payment', 'paid', 'charged', 'invoice', 'receipt', 'оплат', 'заплат', 'платеж', 'списал', 'чек', 'сплат', 'платіж', 'betaling', 'betaald', 'factuur', 'afgeschreven'],
    technical_issue: ['error', 'does not work', "doesn't work", 'cannot log in', 'bug', 'ошибк', 'не работает', 'не могу войти', 'помилк', 'не працює', 'foutmelding', 'werkt niet'],
    competition_music: ['music', 'track', 'song', 'mp3', 'wav', 'музык', 'трек', 'музик', 'muziek'],
    competition_category: ['category', 'categories', 'level', 'solo', 'duo', 'trio', 'small group', 'big group', 'категори', 'уровен', 'соло', 'дуэт', 'категорі', 'рівен', 'categorie', 'niveau'],
    competition: ['competition', 'battle', 'contest', 'props', 'prize', 'конкурс', 'соревнован', 'баттл', 'змаган', 'wedstrijd', 'competitie'],
    heels_master_stage: ['heels master stage', 'master stage', 'hms'],
    choreographer: ['choreographer', 'teacher', 'lineup', 'line up', 'line-up', 'who is teaching', 'хореограф', 'преподавател', 'лайнап', 'состав', 'викладач', 'docent', 'choreograaf'],
    schedule: ['schedule', 'timetable', 'what time', 'which day', 'расписан', 'во сколько', 'в какой день', 'розклад', 'о котрій', 'rooster', 'hoe laat', 'programma'],
    check_in: ['check-in', 'check in', 'checkin', 'wristband', 'регистрация на месте', 'браслет', 'чек-ин', 'inchecken', 'polsband'],
    venue: ['venue', 'where is', 'where will', 'address', 'location', 'apollohal', 'где будет', 'где проход', 'адрес', 'площадк', 'де буде', 'де проход', 'waar is', 'adres', 'locatie'],
    accommodation: ['hotel', 'accommodation', 'hostel', 'where to stay', 'отел', 'гостиниц', 'жиль', 'проживан', 'готел', 'житл', 'overnacht', 'verblijf'],
    travel: ['flight', 'transport', 'airport', 'parking', 'how to get', 'перелет', 'авиабилет', 'трансфер', 'парковк', 'как добраться', 'переліт', 'vlucht', 'vervoer', 'parkeren'],
    pricing: ['how much', 'price', 'cost', 'fee', 'early bird', 'сколько стоит', 'стоимост', 'цена', 'цену', 'цены', 'скільки кошту', 'вартіст', 'ціна', 'wat kost', 'prijs', 'kosten'],
    ticket: ['ticket', 'pass', 'full pass', 'day pass', 'transfer my', 'билет', 'пасс', 'проходк', 'квиток', 'kaartje', 'toegangsbewijs'],
    registration: ['register', 'registration', 'registered', 'sign up', 'зарегистр', 'регистрац', 'записат', 'зареєстр', 'реєстрац', 'inschrijv', 'aanmeld'],
    partnership: ['partnership', 'sponsor', 'collaboration', 'collaborate', 'партнерств', 'спонсор', 'сотрудничеств', 'співпрац', 'samenwerking'],
    event: ['when is', 'dates', 'how many days', 'когда будет', 'когда проход', 'даты', 'коли буде', 'wanneer is', 'data'],
};

// "Is it still available / are there tickets left" — never answerable from a published price list.
export const AVAILABILITY_KEYWORDS: AliasTable = {
    availability: ['still available', 'available', 'sold out', 'tickets left', 'any spots', 'в наличии', 'еще есть', 'остались', 'распродан', 'ще є', 'залишились', 'nog beschikbaar', 'uitverkocht', 'nog kaarten'],
};

export const TICKET_PRODUCTS: AliasTable = {
    full_pass: ['full pass', 'fullpass', 'full package', 'фулл пасс', 'полный пасс'],
    day_pass: ['day pass', 'daypass', 'one day', 'single day', 'дневной', 'на один день', 'dagpas'],
    group: ['group pass', 'group price', 'mini group', 'big group', 'we are', 'групп', 'груп', 'groep'],
};

// The customer asks about a past edition without naming the year.
export const HISTORICAL_KEYWORDS: AliasTable = {
    historical: ['previous', 'last year', 'in the past', 'earlier editions', 'прошл', 'раньше', 'в прошлом году', 'минул', 'раніше', 'vorig jaar', 'eerdere'],
};
