// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers'; // or combineReducers
import { persistenceMiddleware } from '../middleware/persistenceMiddleware';
import { rehydrateState } from '../../utils/rehydrate';
import auth from './slices/authSlice';
import clients from './slices/clientSlice';
import authSigReducer from './slices/authSigSlice';
import mentalHealth from './slices/MentalHealthSlice.js';
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
import files from './slices/filesSlice';         // ✅ NEW: Files management slice
import referrals from './slices/referralSlice';  // ✅ Enhanced referrals slice
import discharge from './slices/dischargeSlice'; // ✅ Enhanced discharge slice
import encounterNote from './slices/encounterNoteSlice'; // ✅ Encounter notes slice
import carePlans from './slices/carePlanSlice.js'; // ✅ Care plans slice

const preloadedState = rehydrateState();

const store = configureStore({
  reducer: {
    auth: auth,
    authSig: authSigReducer,
    clients: clients,
    mentalHealth: mentalHealth,
    arrests: arrestReducer,
    noteArchive: noteArchive,
    medFaceSheet: MedFaceSheet,
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
    clientFace: clientFace,
    files: files,           // ✅ Files management
    referrals: referrals,   // ✅ Enhanced referrals
    discharge: discharge,    // ✅ Enhanced discharge
    encounterNote: encounterNote, // ✅ Encounter notes
    carePlans: carePlans,   // ✅ Care plans management
  },
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'files/uploadFile/pending',      // ✅ File upload actions
          'files/uploadFile/fulfilled',
          'files/uploadFile/rejected',
          'referrals/uploadReferralFile/pending',  // ✅ Referral upload actions
          'referrals/uploadReferralFile/fulfilled',
          'referrals/uploadReferralFile/rejected'
        ],
        ignoredPaths: [
          'files.uploadProgress',          // ✅ Upload progress tracking
          'files.files',                   // File objects with non-serializable data
          'referrals.uploadProgress'       // Referral upload progress
        ]
      },
    }).concat(persistenceMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;