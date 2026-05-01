'use strict';

/** Type de récurrence pour les plages horaires cycliques */
export enum CyclicType {
  CYCLIC_TYPE_WEEK = 1,
  CYCLIC_TYPE_DAY = 2,
  CYCLIC_MONTH_DAY = 3,
}

/** Opération CRUD sur une plage cyclique */
export enum CyclicOpType {
  QUERY = 1,
  ADD = 2,
  REMOVE = 3,
  CLEAR = 4,
}

/** Type d'utilisateur associé à une règle cyclique */
export enum CyclicUserType {
  USER_TYPE_FR = 1,
  USER_TYPE_IC = 2,
}
