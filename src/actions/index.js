import _pick from 'lodash/pick';
import _assign from 'lodash/assign';
import _reduce from 'lodash/reduce';
import _forEach from 'lodash/forEach';
import _isEmpty from 'lodash/isEmpty';
import _keys from 'lodash/keys';
import _isEqual from 'lodash/isEqual';

import { SET_INPUT } from './actionTypes';
import {
    FORM_KEY,
    getReduxMountPoint,
    getInputsFromState,
    inputsHaveErrors
} from '../util/helpers';
import log from '../util/log';
import { getDefaultInputs } from '../reducers';

function _filterUnknownInputs(inputConfig, inputs) {
    // Only update known inputs
    return _reduce(inputs, (result, value, key) => {
        if (!inputConfig[key]) {
            log.error(key + ' is not a valid input.');
        } else {
            result[key] = value;
        }
        return result;
    }, {});
}

export function _setInput(inputConfig, update, meta = {}) {
    return {
        type: SET_INPUT,
        payload: update,
        error: !!inputsHaveErrors(update),
        meta: {
            reduxMountPoint: getReduxMountPoint(inputConfig),
            ...meta
        }
    };
}

function _fireChanges(inputConfig, update, inputsState, state, dispatch) {
    _forEach(update, (input, key) => {
        const { onChange } = inputConfig[key] || {};
        if (onChange) {
            onChange(input, inputsState, state, dispatch);
        }
    });
}

/**
 * Sets inputs' states without validation
 *
 * Also fires onChange callbacks for changed inputs
 *
 * `update` example:
 *  {
 *      email: {
 *          value: 'asdf@asdf.com'
 *      }
 *  }
 */
export function setInput(inputConfig, update, meta = {}) {
    return (dispatch, getState) => {
        dispatch(_setInput(inputConfig, update, meta));
        if (!meta.suppressChange) {
            const state = getState();
            const inputsState = getInputsFromState(inputConfig, state);
            _fireChanges(inputConfig, update, inputsState, state, dispatch);
        }
        return Promise.resolve(update);
    };
}

export function resetInputs(inputConfig, inputKeys, meta = {}) {
    const update = getDefaultInputs(inputConfig);
    return setInput(inputConfig, inputKeys ? _pick(update, inputKeys) : update, {
        reset: true,
        ...meta
    });
}

/**
 * Validates the current state of inputs corresponding to the given keys
 *
 * @param inputConfig
 * @param inputKeys {Array}
 * @returns {Thunk}
 */
export function validateInputs(inputConfig, inputKeys, meta = {}) {
    return (dispatch, getState) => {
        const inputsState = getInputsFromState(inputConfig, getState());
        const keys = inputKeys || _keys(inputsState);
        const inputsToValidate = _reduce(keys, (result, key) => {
            if (key === FORM_KEY) {
                return result;
            }
            const input = inputsState[key];
            if (inputConfig[key] && input) {
                result[key] = typeof input.error !== 'undefined' ? input.error : input.value;
            }
            return result;
        }, {});
        return updateAndValidate(inputConfig, inputsToValidate, {
            ...meta,
            validate: true
        })(dispatch, getState);
    };
}

export function updateAndValidate(inputConfig, update, meta = {}) {
    return (dispatch, getState) => {
        const inputs = _filterUnknownInputs(inputConfig, update);

        if (_isEmpty(inputs)) {
            return Promise.resolve();
        }

        const state = getState();
        const inputsState = getInputsFromState(inputConfig, state);
        const promises = [];

        const createNewState = newInputState => meta.initialize ? ({
            pristine: true,
            ...newInputState
        }) : newInputState;


        const changes = _reduce(inputs, (result, value, key) => {
            const { validator } = inputConfig[key];

            const validationResult = validator ? validator(value, inputsState, state, dispatch) : true,
                prev = inputsState[key] && inputsState[key].value,
                unchanged = _isEqual(prev, value),
                hasAsync = typeof validationResult === 'object' && !!validationResult.then;

            const dispatchAndReturnPromiseResult = inputState =>
                setInput(inputConfig, { [key]: createNewState(inputState) }, meta)(dispatch, getState);

            if (typeof validationResult === 'boolean' || typeof validationResult === 'string' || hasAsync) { // Or Promise
                const change = (validationResult === true || hasAsync) ? ({ // True or hasAsync, set value
                    value: value,
                    validating: hasAsync && !unchanged // Will be validating if async validator exists
                }) : ({ // False returned, input invalid
                    value: prev,
                    error: value || '',
                    validating: false
                });


                // Add errorText if validator returned a string
                if (typeof validationResult === 'string') {
                    change.errorText = validationResult;
                }

                result[key] = createNewState(change);

                if (!hasAsync || unchanged) {
                    promises.push(Promise.resolve({ [key]: createNewState(change) }));
                } else {
                    // Kick off async
                    promises.push(validationResult.then(
                        // Passed validation
                        () => dispatchAndReturnPromiseResult({ value }),
                        // Failed validation
                        errorText => dispatchAndReturnPromiseResult({
                            value: prev,
                            error: value || '',
                            errorText
                        })
                    ));
                }
            } else {
                log.error(`
                Value returned from validator must be a 
                boolean representing valid/invalid, a string representing errorText, or a promise for performing async 
                validation. Got ${typeof validationResult} instead.
            `);
            }

            return result;
        }, {});

        setInput(inputConfig, changes, meta)(dispatch, getState);

        return new Promise((resolve, reject) => {
            Promise.all(promises).then(results => {
                const resultObject = _assign({}, ...results);

                const erroredInputs = inputsHaveErrors(resultObject);
                if (erroredInputs) {
                    reject(erroredInputs);
                } else {
                    resolve(resultObject);
                }
            });
        });
    };
}

export function initializeInputs(inputconfig, update, meta = {}) {
    return updateAndValidate(inputconfig, update, {
        initialize: true,
        ...meta
    });
}

export const bindActions = inputConfig => ({
    setInput: (update, meta) => setInput(inputConfig, update, meta),
    updateAndValidate: (update, meta) => updateAndValidate(inputConfig, update, meta),
    validateInputs: (inputKeys, meta) => validateInputs(inputConfig, inputKeys, meta),
    resetInputs: (inputKeys, meta) => resetInputs(inputConfig, inputKeys, meta),
    initializeInputs: (update, meta) => initializeInputs(inputConfig, update, meta)
});
