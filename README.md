# redux-inputs
[![npm version](https://badge.fury.io/js/redux-inputs.svg)](https://badge.fury.io/js/redux-inputs)
[![Build Status](https://travis-ci.org/zillow/redux-inputs.svg?branch=master)](https://travis-ci.org/zillow/redux-inputs)

`redux-inputs` works with redux to validate and store values from inputs and forms.

## Docs

- [Getting Started](docs/gettingStarted.md)
- [API](docs/api.md)
- [Interactive Demo](./examples.html)

## Installation

`npm install --save redux-inputs`

## Single File Example

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { createInputsReducer, connectWithInputs, ReduxInputsWrapper } from 'redux-inputs';
import { Provider } from 'react-redux';
import thunk = from 'redux-thunk';

const inputsConfig = {
    email: {
        defaultValue: 'test@example.com',
        validator: (value) => typeof value === 'string' && value.indexOf('@') >= 0
    }
};
const reducer = combineReducers({
    inputs: createInputsReducer(inputsConfig)
});
const store = createStore(reducer, applyMiddleware(thunk));

let EmailInput = ({id, value, error, onChange}) => (
    <div>
        <input name={id} value={value} onChange={(e) => onChange(e.target.value)}/>
        {error ? <p style={{color: 'red'}}>Your email must contain an @</p> : null}
    </div>
);
EmailInput = ReduxInputsWrapper(EmailInput);

function Form(props) {
    const { inputs, inputProps } = props;
    return (
        <form>
            <EmailInput {...inputProps.email}/>
            <h3>Input state</h3>
            <pre>{JSON.stringify(inputs, null, 2)}</pre>
        </form>
    );
}
const FormContainer = connectWithInputs(inputsConfig)(s => s)(Form);
ReactDOM.render(<Provider store={store}><FormContainer /></Provider>, document.getElementById('container'));
```
 
## Contributing

### Build

    gulp

### Tests

    gulp eslint
    npm test
