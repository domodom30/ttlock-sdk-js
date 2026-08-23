import { LogOperate } from './LogOperate';
export declare const LogOperateCategory: {
    /** Tous les déverrouillages réussis */
    UNLOCK: LogOperate[];
    /** Tous les verrouillages */
    LOCK: LogOperate[];
    /** Tentatives échouées */
    FAILED: LogOperate[];
    /** Gestion codes / mots de passe */
    PASSCODE: LogOperate[];
    /** Gestion cartes IC */
    IC: LogOperate[];
    /** Gestion empreintes digitales */
    FINGERPRINT: LogOperate[];
    /** Alarmes et alertes */
    ALARM: LogOperate[];
    /** Événements système */
    SYSTEM: LogOperate[];
    /** Périphériques sans fil */
    WIRELESS: LogOperate[];
};
