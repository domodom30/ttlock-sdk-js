'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyclicUserType = exports.CyclicOpType = exports.CyclicType = void 0;
/** Type de récurrence pour les plages horaires cycliques */
var CyclicType;
(function (CyclicType) {
    CyclicType[CyclicType["CYCLIC_TYPE_WEEK"] = 1] = "CYCLIC_TYPE_WEEK";
    CyclicType[CyclicType["CYCLIC_TYPE_DAY"] = 2] = "CYCLIC_TYPE_DAY";
    CyclicType[CyclicType["CYCLIC_MONTH_DAY"] = 3] = "CYCLIC_MONTH_DAY";
})(CyclicType || (exports.CyclicType = CyclicType = {}));
/** Opération CRUD sur une plage cyclique */
var CyclicOpType;
(function (CyclicOpType) {
    CyclicOpType[CyclicOpType["QUERY"] = 1] = "QUERY";
    CyclicOpType[CyclicOpType["ADD"] = 2] = "ADD";
    CyclicOpType[CyclicOpType["REMOVE"] = 3] = "REMOVE";
    CyclicOpType[CyclicOpType["CLEAR"] = 4] = "CLEAR";
})(CyclicOpType || (exports.CyclicOpType = CyclicOpType = {}));
/** Type d'utilisateur associé à une règle cyclique */
var CyclicUserType;
(function (CyclicUserType) {
    CyclicUserType[CyclicUserType["USER_TYPE_FR"] = 1] = "USER_TYPE_FR";
    CyclicUserType[CyclicUserType["USER_TYPE_IC"] = 2] = "USER_TYPE_IC";
})(CyclicUserType || (exports.CyclicUserType = CyclicUserType = {}));
