import type { AliasTable } from '../../knowledge-ingestion';

// RU / UK / NL / EN keyword prefixes per intent, matched with the same word-prefix alias matcher
// as cities/styles (case endings resolve without a stemmer). Table ORDER is the tie-break
// priority when the LLM classification gives no usable intent: the most consequential topics
// (complaints, cancellations, money) win over generic ones.
export const INTENT_KEYWORDS: AliasTable = {
    complaint: ['жалоб', 'недоволен', 'недовольн', 'разочарован', 'не устраивает', 'не обращает внимани', 'не уделяет внимани', 'скарг', 'незадовол', 'розчарован', 'не звертає уваги', 'klacht', 'ontevreden', 'teleurgesteld', 'complaint', 'complain', 'unhappy', 'disappointed', 'dissatisfied', 'not happy'],
    cancellation: ['отмен', 'отказаться', 'расторг', 'заморо', 'прекратить', 'скасув', 'відмовит', 'призупин', 'opzeg', 'annuler', 'pauzeren', 'stopzetten', 'cancel', 'freeze', 'terminate', 'quit'],
    camp: ['lito', 'лито', 'лагер', 'кемп', 'табір', 'табор', 'zomerkamp', 'kamp', 'dance camp', 'camp'],
    payment: ['оплат', 'заплат', 'платеж', 'списал', 'возврат', 'вернуть деньги', 'платіж', 'сплат', 'повернен', 'betaling', 'betalen', 'betaald', 'terugbetal', 'factuur', 'incasso', 'payment', 'paid', 'pay', 'refund', 'charged', 'invoice'],
    subscription: ['абонемент', 'подписк', 'передплат', 'abonnement', 'lidmaatschap', 'subscription', 'membership'],
    pricing: ['сколько стоит', 'стоимост', 'цена', 'цену', 'цены', 'прайс', 'скільки кошту', 'вартіст', 'ціна', 'ціну', 'wat kost', 'kosten', 'prijs', 'tarief', 'how much', 'price', 'cost', 'fee'],
    trial: ['пробн', 'первое занятие', 'перше заняття', 'proefles', 'proef', 'trial', 'first lesson', 'try a class', 'try out'],
    registration: ['запис', 'зарегистр', 'регистрац', 'хочу заниматься', 'хочу танцевать', 'хочу ходить', 'зареєстр', 'хочу займатися', 'хочу танцювати', 'inschrijv', 'aanmeld', 'lid worden', 'sign up', 'signup', 'register', 'enrol', 'enroll', 'join'],
    location: ['где вы наход', 'где находит', 'где наход', 'адрес', 'где проход', 'как добраться', 'де ви знаход', 'де знаход', 'де прохо', 'waar zit', 'waar is', 'waar zijn', 'waar vind', 'adres', 'locatie', 'where are you', 'where is', 'address', 'location', 'located'],
    schedule: ['расписан', 'во сколько', 'когда занятия', 'в какие дни', 'какие дни', 'розклад', 'коли заняття', 'о котрій', 'lesrooster', 'rooster', 'hoe laat', 'welke dagen', 'schedule', 'timetable', 'what time', 'which days'],
    beginner: ['новичок', 'новичк', 'без опыта', 'с нуля', 'никогда не танцевал', 'никогда не занимал', 'новачок', 'без досвіду', 'з нуля', 'ніколи не танцювал', 'beginner', 'beginnend', 'geen ervaring', 'nooit gedanst', 'no experience', 'never danced', 'from scratch'],
    clothing: ['одежд', 'в чем приходить', 'что взять', 'что надеть', 'обув', 'кроссовк', 'одяг', 'що взяти', 'взутт', 'кросівк', 'kleding', 'meenemen', 'schoenen', 'sportkleding', 'clothes', 'clothing', 'wear', 'bring', 'shoes', 'sneakers'],
    parent_question: ['родител', 'можно присутств', 'можно посмотреть', 'батьк', 'ouders', 'parents', 'parent', 'watch the class'],
    age_group: ['возраст', 'вік', 'віку', 'leeftijd', 'age group', 'how old', 'what age'],
    dance_style: ['стиль', 'направлени', 'какой танец', 'який танець', 'напрям', 'dansstijl', 'stijl', 'dance style', 'style'],
};

// Where "the customer asks whether there is a free place" — never answerable from a schedule.
export const AVAILABILITY_KEYWORDS: AliasTable = {
    availability: ['есть ли мест', 'есть место', 'есть свободн', 'свободные мест', 'места есть', 'є місц', 'є вільн', 'вільні місц', 'plek vrij', 'nog plek', 'plaats vrij', 'nog ruimte', 'is there space', 'is there room', 'any space', 'spots available', 'spot available', 'place available', 'availability', 'still available'],
};

export const AUDIENCE_KEYWORDS: AliasTable = {
    teen: ['подрост', 'подліт', 'школьни', 'tiener', 'teen'],
    child: ['ребен', 'дети', 'детей', 'детск', 'сын', 'дочь', 'дочк', 'дитин', 'діти', 'дітей', 'дитяч', 'син', 'доньк', 'kind', 'zoon', 'dochter', 'child', 'kids', 'kid', 'son', 'daughter'],
};

export const PAYMENT_TOPICS: AliasTable = {
    refund: ['возврат', 'вернуть деньги', 'повернен', 'terugbetal', 'refund'],
    payment_failed: ['не прошл', 'списали дважды', 'дважды', 'ошибк', 'не пройшл', 'двічі', 'mislukt', 'dubbel', 'failed', 'charged twice', 'double charge'],
    invoice: ['счет', 'інвойс', 'рахунок', 'factuur', 'invoice'],
    payment_method: ['mollie', 'ideal', 'sepa', 'incasso', 'картой', 'карткою', 'direct debit'],
};

export const SUBSCRIPTION_TOPICS: AliasTable = {
    freeze: ['заморо', 'приостанов', 'призупин', 'pauzeren', 'freeze', 'pause'],
    cancel: ['отмен', 'расторг', 'отказаться', 'скасув', 'opzeg', 'cancel', 'terminate'],
    price: ['сколько стоит', 'стоимост', 'цена', 'скільки кошту', 'вартіст', 'wat kost', 'prijs', 'how much', 'price', 'cost'],
};

export const CAMP_TOPICS: AliasTable = {
    price: ['сколько стоит', 'стоимост', 'цена', 'скільки кошту', 'вартіст', 'wat kost', 'prijs', 'how much', 'price', 'cost', 'deposit', 'депозит', 'aanbetaling'],
    booking: ['бронир', 'забронир', 'запис', 'бронюв', 'boeken', 'reserveren', 'book', 'booking', 'reserve'],
    transport: ['автобус', 'трансфер', 'bus', 'vervoer', 'transport'],
    safety: ['безопасн', 'безпек', 'вожат', 'veiligheid', 'begeleiding', 'safety', 'supervision'],
};

export const WEEKDAY_KEYWORDS: AliasTable = {
    monday: ['понедельник', 'понеділ', 'maandag', 'monday'],
    tuesday: ['вторник', 'вівтор', 'dinsdag', 'tuesday'],
    wednesday: ['среда', 'среду', 'среде', 'середа', 'середу', 'woensdag', 'wednesday'],
    thursday: ['четверг', 'четвер', 'donderdag', 'thursday'],
    friday: ['пятниц', "п'ятниц", 'пятниц', 'vrijdag', 'friday'],
    saturday: ['суббот', 'субот', 'zaterdag', 'saturday'],
    sunday: ['воскресень', 'неділ', 'zondag', 'sunday'],
};
