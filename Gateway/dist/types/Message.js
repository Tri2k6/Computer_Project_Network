"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessage = void 0;
const createMessage = (type, data = {}, to, from) => {
    return { type, data, to, from };
};
exports.createMessage = createMessage;
