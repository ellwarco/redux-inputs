import { expect, assert } from 'chai';
import sinon from 'sinon';
import React from 'react';
import { createInputsReducer } from '../src';
import { SET_INPUT, VALIDATING } from '../src/actions/actionTypes';
import { setInput, validating, updateAndValidate, validateInputs, resetInputs } from '../src/actions';
import { DEFAULT_REDUX_MOUNT_POINT, getInputProps } from '../src/util/helpers';
import ReduxInputsWrapper, { createOnChangeWithTransform } from '../src/util/ReduxInputsWrapper';

describe('createInputsReducer', () => {
    describe('no input config', () => {
        it('should throw an error', () => {
            expect(createInputsReducer).to.throw(Error);
        });
    });
    describe('one input, no validation', () => {
        let fn = () => createInputsReducer({
            email: {}
        });

        const initialState = {
            email: {
                value: undefined,
            }
        };

        it('should not throw any errors', () => {
            expect(fn).to.not.throw(Error);
        });
        it('should initialize default values', () => {
            let reducer = fn();
            let state = reducer();
            expect(state).to.deep.equal({
                _form: {},
                ...initialState
            })
        });
        it('should accept SET_INPUT for inputs defined in inputConfig', () => {
            let reducer = fn();
            let state = reducer();
            state = reducer(state, {
                type: SET_INPUT,
                payload: {
                    email: {
                        value: 'test@test.com'
                    }
                },
                meta: {
                    reduxMountPoint: DEFAULT_REDUX_MOUNT_POINT
                }
            });
            expect(state).to.deep.equal({
                _form: {},
                email: { value: 'test@test.com' }
            });
        });
        it('should also accept SET_INPUT for inputs NOT defined in inputConfig', () => {
            let reducer = fn();
            let state = reducer();
            state = reducer(state, {
                type: SET_INPUT,
                payload: { name: { value: 'test' }},
                meta: {
                    reduxMountPoint: DEFAULT_REDUX_MOUNT_POINT
                }
            });
            expect(state).to.deep.equal({
                _form: {},
                ...initialState,
                name: { value: 'test' }
            });
        });
        it('should ignore SET_INPUT for invalid inputs, while accepting valid inputs', () => {
            let reducer = fn();
            let state = reducer();
            state = reducer(state, {
                type: SET_INPUT,
                payload: {
                    email: { value: 'test@test.com' },
                    name: { value: 'test' }
                },
                meta: {
                    reduxMountPoint: DEFAULT_REDUX_MOUNT_POINT
                }
            });
            expect(state).to.deep.equal({
                _form: {},
                email: { value: 'test@test.com' },
                name: { value: 'test' }
            });
        });
        it('should add inputs missing from previous state that are in inputConfig to new state', () => {
            let reducer = createInputsReducer({
                email: {},
                name: { defaultValue: 'test' }
            });
            let state = reducer({
                // Previous state
                phone: { value: 123 }
            });
            expect(state).to.deep.equal({
                _form: {},
                email: { value: undefined },
                name: { value: 'test' },
                phone: { value: 123 }
            });
        });
        it('should only listen to actions with correct reduxMountPoint', () => {
            let reducer = createInputsReducer({
                _form: {
                    reduxMountPoint: 'alternate'
                }
            });

            let state = reducer();
            expect(state).to.deep.equal({
                _form: {}
            });

            state = reducer(state, {
                type: SET_INPUT,
                payload: {
                    email: { value: 'test@test.com' },
                },
                meta: {
                    reduxMountPoint: DEFAULT_REDUX_MOUNT_POINT
                }
            });
            expect(state).to.deep.equal({
                _form: {}
            });

            state = reducer(state, {
                type: SET_INPUT,
                payload: {
                    email: { value: 'test@test.com' },
                },
                meta: {
                    reduxMountPoint: 'alternate'
                }
            });
            expect(state).to.deep.equal({
                _form: {},
                email: { value: 'test@test.com' }
            });
        });
    });
    describe('one input, client-side validation', () => {
        let fn = () => createInputsReducer({
            positiveNumber: {
                validator: (val) => val > 0
            }
        });

        const initialState = {
            positiveNumber: {
                value: undefined
            }
        };

        it('should not throw any errors', () => {
            expect(fn).to.not.throw(Error);
        });
        it('should initialize default values', () => {
            let reducer = fn();
            let state = reducer();
            expect(state).to.deep.equal({
                _form: {},
                ...initialState
            })
        });
        it('should accept SET_INPUT for valid input', () => {
            let reducer = fn();
            let state = reducer();
            state = reducer(state, {
                type: SET_INPUT,
                payload: {
                    positiveNumber: {
                        value: 1
                    }
                },
                meta: {
                    reduxMountPoint: DEFAULT_REDUX_MOUNT_POINT
                }
            });
            expect(state).to.deep.equal({
                _form: {},
                positiveNumber: { value: 1 }
            });
        });
    });
});

describe('setInput action creator', () => {
    it('should create a valid SET_INPUT action', () => {
        let action = setInput({}, {
            email: { value: 'test@test.com' }
        });
        expect(action).to.deep.equal({
            type: SET_INPUT,
            payload: { email: { value: 'test@test.com' } },
            error: false,
            meta: { reduxMountPoint: DEFAULT_REDUX_MOUNT_POINT }
        });
    });
    it('should set error correctly on errored payload', () => {
        let action = setInput({}, {
            email: { error: 'test@test.com' }
        });
        expect(action).to.deep.equal({
            type: SET_INPUT,
            payload: { email: { error: 'test@test.com' } },
            error: true,
            meta: { reduxMountPoint: DEFAULT_REDUX_MOUNT_POINT }
        });
    });
    it('should set reduxMountPoint meta information based on inputConfig settings', () => {
        let action = setInput({
            // Input Config
            _form: {
                reduxMountPoint: 'alternate'
            }
        }, {
            email: { value: 'test@test.com' }
        });
        expect(action).to.deep.equal({
            type: SET_INPUT,
            payload: { email: { value: 'test@test.com' } },
            error: false,
            meta: { reduxMountPoint: 'alternate' }
        });
    });
});

describe('resetInputs action creator', () => {
    it('should return a RI_SET_INPUT action', () => {
        let actual = resetInputs({});
        expect(actual.type).to.equal('RI_SET_INPUT');
    });
    it('should return values back to their defaults', () => {
        let actual = resetInputs({ blank: {}, defaulted: { defaultValue: 2 }});
        expect(actual.payload).to.deep.equal({
            blank: { value: undefined },
            defaulted: { value: 2}
        });
    });
});

describe('validating action creator', () => {
    it('should create a valid VALIDATING action', () => {
        let action = validating({}, true);
        expect(action).to.deep.equal({
            type: VALIDATING,
            payload: true,
            meta: { reduxMountPoint: DEFAULT_REDUX_MOUNT_POINT }
        });
    });
});


describe('updateAndValidate thunk', () => {
    it('correctly dispatches client side validation changes when valid', () => {
        let thunk = updateAndValidate({
            email: {
                validator: value => (value && value.length > 0)
            }
        }, {
            email: 'test@test.com'
        });

        thunk((action) => {
            // Capture dispatched action
            expect(action).to.deep.equal({
                type: 'RI_SET_INPUT',
                payload: {
                    email: { value: 'test@test.com', validating: false }
                },
                error: false,
                meta: { reduxMountPoint: 'inputs' }
            });
        }, () => ({
            // Mocked initial state
            inputs: {}
        }));
    });
    it('correctly dispatches client side validation changes when errored', () => {
        let thunk = updateAndValidate({
            email: {
                validator: value => (value && value.length > 5)
            }
        }, {
            email: 'test'
        });

        thunk((action) => {
            // Capture dispatched action
            expect(action).to.deep.equal({
                type: 'RI_SET_INPUT',
                payload: {
                    email: { value: 'previous', error: 'test', validating: false }
                },
                error: true,
                meta: { reduxMountPoint: 'inputs' }
            });
        }, () => ({
            // Mocked initial state
            inputs: {
                email: { value: 'previous' }
            }
        }));
    });
    it('correctly dispatches client side validation with errorText', () => {
        let thunk = updateAndValidate({
            email: {
                validator: value => {
                    if (!value) {
                        return false
                    } else if (value.length < 5) {
                        return 'Too short!';
                    }
                    return false;
                }
            }
        }, {
            email: 'test'
        });

        thunk((action) => {
            // Capture dispatched action
            expect(action).to.deep.equal({
                type: 'RI_SET_INPUT',
                payload: {
                    email: {
                        error: 'test',
                        errorText: 'Too short!',
                        validating: false,
                        value: 'previous'
                    }
                },
                error: true,
                meta: { reduxMountPoint: 'inputs' }
            });
        }, () => ({
            // Mocked initial state
            inputs: {
                email: { value: 'previous' }
            }
        }));
    });
    it('works with deep reduxMountPoint', () => {
        let thunk = updateAndValidate({
            _form: {
                reduxMountPoint: 'page.inputs'
            },
            email: {
                validator: value => !!(value && value.length > 0)
            }
        }, {
            email: ''
        });

        thunk((action) => {
            // Capture dispatched action
            expect(action).to.deep.equal({
                type: 'RI_SET_INPUT',
                payload: {
                    email: { value: 'test@test.com', error: '', validating: false }
                },
                error: true,
                meta: { reduxMountPoint: 'page.inputs' }
            });
        }, () => ({
            // Mocked initial state
            page: {
                inputs: {
                    email: { value: 'test@test.com' }
                }
            }
        }));
    });
    it('correctly dispatches async validation VALID changes', () => {
        let thunk = updateAndValidate({
            email: {
                validator: value => {
                    return Promise.resolve();
                }
            }
        }, {
            email: 'test@test.com'
        });

        const stubbedDispatch = sinon.stub();

        return thunk(stubbedDispatch, () => ({
            // Mocked initial state
            inputs: {}
        })).then(inputState => {
            expect(inputState).to.deep.equal({
                email: { value: 'test@test.com' }
            });
            expect(stubbedDispatch.getCall(0).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: true,
                type: "RI_VALIDATING"
            });
            expect(stubbedDispatch.getCall(1).args[0]).to.deep.equal({
                error: false,
                meta: { reduxMountPoint: "inputs" },
                payload: { email: { validating: true, value: "test@test.com" }},
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(2).args[0]).to.deep.equal({
                error: false,
                meta: { reduxMountPoint: "inputs" },
                payload: { email: { value: "test@test.com" }},
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(3).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: false,
                type: "RI_VALIDATING"
            });
        });
    });
    it('correctly dispatches async validation INVALID changes', () => {
        let thunk = updateAndValidate({
            email: {
                validator: value => {
                    return Promise.reject();
                }
            }
        }, {
            email: 'test@test.com'
        });

        const stubbedDispatch = sinon.stub();

        return thunk(stubbedDispatch, () => ({
            // Mocked initial state
            inputs: {}
        })).then(null, inputState => {
            expect(inputState).to.deep.equal({
                email: {
                    error: 'test@test.com',
                    errorText: undefined,
                    value: undefined
                }
            });
            expect(stubbedDispatch.getCall(0).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: true,
                type: "RI_VALIDATING"
            });
            expect(stubbedDispatch.getCall(1).args[0]).to.deep.equal({
                error: false,
                meta: { reduxMountPoint: "inputs" },
                payload: { email: { validating: true, value: "test@test.com" }},
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(2).args[0]).to.deep.equal({
                error: true,
                meta: { reduxMountPoint: "inputs" },
                payload: { email: {
                    error: "test@test.com",
                    errorText: undefined,
                    value: undefined
                }},
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(3).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: false,
                type: "RI_VALIDATING"
            });
        });
    });
    it('correctly dispatches async validation INVALID changes with errorText', () => {
        let thunk = updateAndValidate({
            email: {
                validator: value => {
                    return Promise.reject('Invalid domain!');
                }
            }
        }, {
            email: 'test@test.com'
        });

        const stubbedDispatch = sinon.stub();

        return thunk(stubbedDispatch, () => ({
            // Mocked initial state
            inputs: {}
        })).then(null, inputState => {
            expect(inputState).to.deep.equal({
                email: {
                    error: 'test@test.com',
                    errorText: 'Invalid domain!',
                    value: undefined
                }
            });
            expect(stubbedDispatch.getCall(0).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: true,
                type: "RI_VALIDATING"
            });
            expect(stubbedDispatch.getCall(1).args[0]).to.deep.equal({
                error: false,
                meta: { reduxMountPoint: "inputs" },
                payload: { email: { validating: true, value: "test@test.com" }},
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(2).args[0]).to.deep.equal({
                error: true,
                meta: { reduxMountPoint: "inputs" },
                payload: { email: {
                    error: "test@test.com",
                    errorText: 'Invalid domain!',
                    value: undefined
                }},
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(3).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: false,
                type: "RI_VALIDATING"
            });
        });
    });
    it('correctly dispatches mixed client + async validation VALID changes', () => {
        let thunk = updateAndValidate({
            email: {
                validator: value => {
                    return Promise.resolve();
                }
            },
            name: {
                validator: value => !!value && value.length > 2
            }
        }, {
            email: 'test@test.com',
            name: 'Bob'
        });

        const stubbedDispatch = sinon.stub();

        return thunk(stubbedDispatch, () => ({
            // Mocked initial state
            inputs: {}
        })).then(inputState => {
            expect(inputState).to.deep.equal({
                email: { value: 'test@test.com' },
                name: { value: 'Bob', validating: false }
            });
            expect(stubbedDispatch.getCall(0).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: true,
                type: "RI_VALIDATING"
            });
            expect(stubbedDispatch.getCall(1).args[0]).to.deep.equal({
                error: false,
                meta: { reduxMountPoint: "inputs" },
                payload: {
                    email: { validating: true, value: "test@test.com" },
                    name: { validating: false, value: 'Bob' }
                },
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(2).args[0]).to.deep.equal({
                error: false,
                meta: { reduxMountPoint: "inputs" },
                payload: { email: { value: "test@test.com" }},
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(3).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: false,
                type: "RI_VALIDATING"
            });
        });
    });
    it('correctly dispatches mixed invalid client + valid async validation changes', () => {
        let thunk = updateAndValidate({
            email: {
                validator: value => {
                    return Promise.resolve();
                }
            },
            name: {
                validator: value => !!value && value.length > 2
            }
        }, {
            email: 'test@test.com',
            name: 'Jo'
        });

        const stubbedDispatch = sinon.stub();

        return thunk(stubbedDispatch, () => ({
            // Mocked initial state
            inputs: {}
        })).then(null, inputState => {
            expect(inputState).to.deep.equal({
                name: { error: 'Jo', validating: false, value: undefined }
            });
            expect(stubbedDispatch.getCall(0).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: true,
                type: "RI_VALIDATING"
            });
            expect(stubbedDispatch.getCall(1).args[0]).to.deep.equal({
                error: true,
                meta: { reduxMountPoint: "inputs" },
                payload: {
                    email: { validating: true, value: "test@test.com" },
                    name: { validating: false, error: 'Jo', value: undefined }
                },
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(2).args[0]).to.deep.equal({
                error: false,
                meta: { reduxMountPoint: "inputs" },
                payload: { email: { value: "test@test.com" }},
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(3).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: false,
                type: "RI_VALIDATING"
            });
        });
    });
    it('correctly dispatches mixed valid client + invalid async validation changes', () => {
        let thunk = updateAndValidate({
            email: {
                validator: value => {
                    return Promise.reject();
                }
            },
            name: {
                validator: value => !!value && value.length > 2
            }
        }, {
            email: 'test@test.com',
            name: 'Bob'
        });

        const stubbedDispatch = sinon.stub();

        return thunk(stubbedDispatch, () => ({
            // Mocked initial state
            inputs: {}
        })).then(null, inputState => {
            expect(inputState).to.deep.equal({
                email: { error: 'test@test.com', errorText: undefined, value: undefined }
            });
            expect(stubbedDispatch.getCall(0).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: true,
                type: "RI_VALIDATING"
            });
            expect(stubbedDispatch.getCall(1).args[0]).to.deep.equal({
                error: false,
                meta: { reduxMountPoint: "inputs" },
                payload: {
                    email: { validating: true, value: "test@test.com" },
                    name: { validating: false, value: 'Bob' }
                },
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(2).args[0]).to.deep.equal({
                error: true,
                meta: { reduxMountPoint: "inputs" },
                payload: { email: { error: "test@test.com", errorText: undefined, value: undefined }},
                type: "RI_SET_INPUT"
            });
            expect(stubbedDispatch.getCall(3).args[0]).to.deep.equal({
                meta: { reduxMountPoint: "inputs" },
                payload: false,
                type: "RI_VALIDATING"
            });
        });
    });
});

describe('validateInputs thunk', () => {
    it('passes valid inputs', () => {
        let thunk = validateInputs({
            email: {
                validator: value => (value && value.length > 0)
            }
        }, ['email']);

        thunk((action) => {
            expect(action).to.deep.equal({
                type: 'RI_SET_INPUT',
                payload: { email: { value: 'valid', validating: false } },
                error: false,
                meta: { reduxMountPoint: 'inputs' }
            });
        }, () => ({ inputs: { email: { value: 'valid' } } }) /* getState */).then((results) => {
            expect(results).to.deep.equal({
                email: { value: 'valid', validating: false }
            });
        });
    });
    it('fails invalid inputs', () => {
        let thunk = validateInputs({
            email: {
                validator: value => !!(value && value.length > 0)
            }
        }, ['email']);

        thunk((action) => { // Dispatch
            expect(action).to.deep.equal({
                type: 'RI_SET_INPUT',
                payload: { email: { value: undefined, error: '', validating: false } },
                error: true,
                meta: { reduxMountPoint: 'inputs' }
            });
        }, () => ({ inputs: { email: { value: undefined } } }) /* getState */).then(null, (erroredInputs) => {
            // Reject
            expect(erroredInputs).to.equal({
                email: { value: undefined, error: '', validating: false }
            });
        });
    });
});
const noop = () => {};
describe('getInputProps', () => {
    const basicInputConfig = { email: {} };
    const multiInputConfig = { email: {}, name: {} };
    const extraPropsInputConfig = { email: { props: { formatter: 3 } } };
    const basicInputState = { email: { value: 1 } };
    const multiInputState = { email: { value: 1 }, name: { value: 4 } };
    const errorInputState = { email: { value: 1, error: 2 } };
    const errorTextState = { email: { value: 1, errorText: 'GANKSHARK' } };
    it('returns objects with _id set', () => {
        const actual = getInputProps(basicInputConfig, basicInputState, noop);
        expect(actual.email._id).to.equal('inputs:email');
    });
    it('handles non-errored inputs', () => {
        const actual = getInputProps(basicInputConfig, basicInputState, noop);
        expect(actual.email.value).to.equal(1);
        expect(actual.email.error).to.be.false;
    });
    it('handles errored inputs', () => {
        const actual = getInputProps(basicInputConfig, errorInputState, noop);
        expect(actual.email.value).to.equal(2);
        expect(actual.email.error).to.be.true;
    });
    it('passes along extra props from the config to the input', () => {
        const actual = getInputProps(extraPropsInputConfig, errorInputState, noop);
        expect(actual.email.formatter).to.equal(3);
    });
    it('passes errorText from state to input', () => {
        const actual = getInputProps(basicInputConfig, errorTextState, noop);
        expect(actual.email.errorText).to.equal('GANKSHARK');
    });
    it('binds dispatchChange to dispatch', () => {
        const dispatch = sinon.spy();
        const actual = getInputProps(basicInputConfig, basicInputState, dispatch);
        expect(actual.email.dispatchChange).to.be.a('function');
        actual.email.dispatchChange({});
        expect(dispatch.calledOnce).to.be.true;
    });
    it('handles multiple objects', () => {
        const actual = getInputProps(multiInputConfig, multiInputState, noop);
        expect(actual.email._id).to.equal('inputs:email');
        expect(actual.name._id).to.equal('inputs:name');
    });
    it('throws an invariant error when ids are not present in state', () => {
        const actualFn = () => getInputProps(multiInputConfig, basicInputState, noop);
        expect(actualFn).to.throw();
    });
});
const promiseThunk = () => Promise.resolve();
const promiseRejectThunk = () => Promise.reject();
describe('createOnChangeWithTransform', () => {
    it('returns a function', () => {
        expect(createOnChangeWithTransform('id', noop)).to.be.a('function');
    });
    it('returned function runs onChangeTransform on the given event', () => {
        const onChangeTransform = sinon.spy();
        const actual = createOnChangeWithTransform('id', promiseThunk, onChangeTransform);
        actual('val');
        expect(onChangeTransform.calledWith('val')).to.be.true;
    });
    it('returned function runs parser on the onChangeTransform value', () => {
        const parser = sinon.spy();
        const actual = createOnChangeWithTransform('id', promiseThunk, () => 'val2', parser);
        actual('val');
        expect(parser.calledWith('val2')).to.be.true;
    });
    it('returned function calls dispatchChange with an object with parsed value', () => {
        const dispatchChange = sinon.spy(promiseThunk);
        const actual = createOnChangeWithTransform('email', dispatchChange, () => 'val2');
        actual('val');
        expect(dispatchChange.calledOnce).to.be.true;
        const args = dispatchChange.args[0];
        expect(args[0]).to.deep.equal({ email: 'val2' });
    });
    it('returned function returns a promise', () => {
        const onChange = createOnChangeWithTransform('id', promiseThunk);
        const actual = onChange('val');
        expect(actual.then).to.be.a('function');
    });
});
describe('ReduxInputsWrapper', () => {
    function Component(props) {
        return <div {...props}/>;
    }
    it('returns a functional component', () => {
        expect(ReduxInputsWrapper(Component)).to.be.a('function');
    });
    describe('returned component', () => {
        it('renders the given component', () => {
            const wrapped = ReduxInputsWrapper(Component);
            const rendered = wrapped({ _id: 'email', dispatchChange: noop });
            expect(rendered.type).to.equal(Component);
        });
        it('passes value if no formatter is given', () => {
            const wrapped = ReduxInputsWrapper(Component);
            const rendered = wrapped({ _id: 'email', dispatchChange: noop, value: 'logical' });
            expect(rendered.props.value).to.equal('logical');
        });
        it('formats a value if a formatter is given', () => {
            const wrapped = ReduxInputsWrapper(Component);
            const rendered = wrapped({
                _id: 'email', dispatchChange: noop,
                value: 'logical',
                formatter: () => 'formatted'
            });
            expect(rendered.props.value).to.equal('formatted');
        });
        it('uses _id as id if not overridden', () => {
            const wrapped = ReduxInputsWrapper(Component);
            const rendered = wrapped({
                _id: 'email', dispatchChange: noop
            });
            expect(rendered.props.id).to.equal('email');
        });
        it('allows overriding the given id', () => {
            const wrapped = ReduxInputsWrapper(Component);
            const rendered = wrapped({
                _id: 'email', dispatchChange: noop,
                id: 'overwrite',
                value: 'logical',
                formatter: () => 'formatted'
            });
            expect(rendered.props.id).to.equal('overwrite');
        });
    });
});
