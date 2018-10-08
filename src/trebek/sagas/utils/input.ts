import { take, getContext, select, put } from 'redux-saga/effects';
import { INPUT } from '../../actionTypes';
import { BaseAction } from '../../../types';
import clean from '../../helpers/clean';
import { createContestant } from '../../actions/contestants';

type Handler = (action: BaseAction, matches: string[][]) => void;

export default function* input(
    matchers: string | string[] | RegExp | RegExp[],
    handler?: Handler,
) {
    const finalMatchers: RegExp[] = (Array.isArray(matchers)
        ? matchers
        : [matchers]
    ).map(pattern => {
        let fullMessage = pattern;
        if (pattern instanceof RegExp) {
            fullMessage = pattern.source;
        }

        return new RegExp(`^${fullMessage}$`, 'i');
    });

    const studio = yield getContext('studio');
    const manager = yield getContext('manager');

    while (true) {
        const action = yield take(INPUT);

        // Ensure this is related to us:
        if (action.studio !== studio) continue;

        let valid = false;
        const matches = finalMatchers.map(trigger => {
            const m = trigger.exec(clean(action.payload.text));

            if (m !== null) {
                valid = true;
            }

            return m ? m.slice(1) : [];
        });

        if (valid) {
            const contestant = yield select(({ contestants }) => contestants[action.contestant]);
            if (!contestant) {
                const displayName = yield manager.getDisplayName(action.contestant);
                yield put(createContestant(action.contestant, displayName));
            }

            // If there is no handler, then we treat this as a returned input:
            if (handler) {
                yield handler(action, matches);
            } else {
                return { action, matches };
            }
        }
    }
}