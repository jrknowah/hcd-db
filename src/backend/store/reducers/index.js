// src/store/reducers/index.js
import { combineReducers } from '@reduxjs/toolkit';
import clientReducer from '../slices/clientSlice';
import authReducer from '../slices/authSlice';

const rootReducer = combineReducers({
  clients: clientReducer,
  auth: authReducer,
});

export default rootReducer;
