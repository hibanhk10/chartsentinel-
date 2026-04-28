import api from './api';

export const networkingService = {
    listMembers() {
        return api.get('/networking/members');
    },

    getMyLocation() {
        return api.get('/networking/me/location');
    },

    updateMyLocation(payload) {
        return api.patch('/networking/me/location', payload);
    },
};
