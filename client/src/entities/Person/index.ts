export {
    listPeople,
    listPayees,
    listPeoplePage,
    getPerson,
    savePerson,
    deletePerson,
    addPersonRole,
    removePersonRole,
    getPersonActivity,
} from './api/personApi';
export { isClient } from './model/isClient';
export { PERSON_SOURCES, PERSON_ROLES } from './model/types';
export type {
    PersonSource,
    PeopleFilters,
    PersonRole,
    Person,
    RemovalBlocker,
    PersonRemoval,
    Activity,
} from './model/types';
export { fullNameOf } from './model/fullName';
