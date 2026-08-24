'use strict';

/** Recurrence type for cyclic time ranges */
export enum CyclicType {
  CYCLIC_TYPE_WEEK = 1,
  CYCLIC_TYPE_DAY = 2,
  CYCLIC_MONTH_DAY = 3,
}

/** CRUD operation on a cyclic time range */
export enum CyclicOpType {
  QUERY = 1,
  ADD = 2,
  REMOVE = 3,
  CLEAR = 4,
}

/** User type associated with a cyclic rule */
export enum CyclicUserType {
  USER_TYPE_FR = 1,
  USER_TYPE_IC = 2,
}
