/**
redux-inputs

 Requirements:
    packages: redux, redux-thunk
    Apply redux-thunk to store
 */

/**
 * Action Types
 * SET_INPUT - Called after input(s) are validated and set.
 * LOADING - Called when async starts/finishes with `force` boolean.
 */
export { SET_INPUT, VALIDATING } from './actions/actionTypes.js';

/**
 * Reducer creator
 */
export { createInputsReducer } from './reducers';

/**
 * Action creators and thunks
 */
export {
    setInput,
    validateInputs,
    updateAndValidate,
    validating,
    resetInputs
} from './actions';

/**
 * Utility functions
 */
export { getInputProps, mapInputValues, FORM_KEY } from './util/helpers';
export { default as Wrapper } from './util/ReduxInputsWrapper';
