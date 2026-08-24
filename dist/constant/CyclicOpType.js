'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyclicUserType = exports.CyclicOpType = exports.CyclicType = void 0;
/** Recurrence type for cyclic time ranges */
var CyclicType;
(function (CyclicType) {
    CyclicType[CyclicType["CYCLIC_TYPE_WEEK"] = 1] = "CYCLIC_TYPE_WEEK";
    CyclicType[CyclicType["CYCLIC_TYPE_DAY"] = 2] = "CYCLIC_TYPE_DAY";
    CyclicType[CyclicType["CYCLIC_MONTH_DAY"] = 3] = "CYCLIC_MONTH_DAY";
})(CyclicType || (exports.CyclicType = CyclicType = {}));
/** CRUD operation on a cyclic time range */
var CyclicOpType;
(function (CyclicOpType) {
    CyclicOpType[CyclicOpType["QUERY"] = 1] = "QUERY";
    CyclicOpType[CyclicOpType["ADD"] = 2] = "ADD";
    CyclicOpType[CyclicOpType["REMOVE"] = 3] = "REMOVE";
    CyclicOpType[CyclicOpType["CLEAR"] = 4] = "CLEAR";
})(CyclicOpType || (exports.CyclicOpType = CyclicOpType = {}));
/** User type associated with a cyclic rule */
var CyclicUserType;
(function (CyclicUserType) {
    CyclicUserType[CyclicUserType["USER_TYPE_FR"] = 1] = "USER_TYPE_FR";
    CyclicUserType[CyclicUserType["USER_TYPE_IC"] = 2] = "USER_TYPE_IC";
})(CyclicUserType || (exports.CyclicUserType = CyclicUserType = {}));
