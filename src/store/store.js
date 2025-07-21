// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers'; // or combineReducers
import auth from './slices/authSlice';
import clientReducer from './slices/clientSlice';
import medFaceSheetReducer from './slices/medFaceSheetSlice';
import authSigReducer from './slices/authSigSlice';
import mentalHealthReducer from './slices/mentalHealthSlice';
import arrestReducer from './slices/arrestActions';
import noteArchive from './slices/noteArchiveSlice';
import MedFaceSheet from "./slices/medFaceSheetSlice";
import medScreening from "./slices/medScreeningSlice";
import progressNote from './slices/progressNoteSlice';
import nursingAdmission from './slices/nursingAdmissionSlice';
import idtNursing from './slices/idtNursingSlice';
import idtProvider from './slices/idtProviderSlice';
import nursingArchive from './slices/nursingArchiveSlice';
import section6 from './slices/section6Slice';
import idtCaseManager from './slices/idtNoteCmSlice';
import personalInventory from './slices/personalInventorySlice';
import miscDoc from './slices/miscDocSlice';
import assessCarePlans from './slices/assessCarePlansSlice';
import bioSocial from './slices/bioSocialSlice.js';
import reassessment from './slices/reassessmentSlice';
import clientFace from './slices/clientFaceSlice';

const store = configureStore({
  reducer: {
    auth: authSigReducer,
    client: clientReducer,
    medFaceSheet: medFaceSheetReducer,
    authSig: authSigReducer,
    mentalHealth: mentalHealthReducer,
    arrests: arrestReducer,
    noteArchive: noteArchive,
    MedFaceSheet: MedFaceSheet,
    medScreening: medScreening,
    progressNote: progressNote,
    nursingAdmission: nursingAdmission,
    idtNursing: idtNursing,
    idtProvider: idtProvider,
    nursingArchive: nursingArchive,
    section6: section6,
    idtCaseManager: idtCaseManager,
    personalInventory: personalInventory,
    miscDoc: miscDoc,
    assessCarePlans: assessCarePlans,
    bioSocial: bioSocial,
    reassessment: reassessment,
    clientFace: clientFace


  }
});

export default store;
