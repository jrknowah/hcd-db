// // ===== FullLayout.jsx (update imports) =====
// import { useContext } from 'react';
// import { styled, Container, Box, useTheme } from '@mui/material';
// import { Outlet } from 'react-router-dom'; // ✅ Import from react-router-dom
// import Header from './vertical/header/Header';
// import Sidebar from './vertical/sidebar/Sidebar';
// import Customizer from './shared/customizer/Customizer';
// import Navigation from './horizontal/navbar/Navigation';
// import HorizontalHeader from './horizontal/header/Header';
// import ScrollToTop from '../../components/shared/ScrollToTop';
// import LoadingBar from 'src/LoadingBar';
// import { CustomizerContext } from 'src/context/CustomizerContext';

// const MainWrapper = styled('div')(() => ({}));

// const PageWrapper = styled('div')(() => ({
//   display: 'flex',
//   flexGrow: 1,
//   paddingBottom: '60px',
//   flexDirection: 'column',
//   zIndex: 1,
//   backgroundColor: 'transparent',
// }));

// const FullLayout = () => {
//   const { isLayout, activeLayout, isCollapse } = useContext(CustomizerContext);
//   const theme = useTheme();

//   return (
//     <>
      
//       <MainWrapper>
//         {/* ------------------------------------------- */}
//         {/* Header */}
//         {/* ------------------------------------------- */}
//         {activeLayout === 'horizontal' ? '' : <Header />}
//         {/* ------------------------------------------- */}
//         {/* Sidebar */}
//         {/* ------------------------------------------- */}
//         {activeLayout === 'horizontal' ? '' : <Sidebar />}
//         {/* ------------------------------------------- */}
//         {/* Main Wrapper */}
//         {/* ------------------------------------------- */}

//         <PageWrapper
//           className="page-wrapper"
//           sx={{
//             ...(activeLayout === 'vertical' && {
//               [theme.breakpoints.up('lg')]: {
//                 ml: `256px`,
//               },
//             }),

//             ...(isCollapse === 'mini-sidebar' && {
//               [theme.breakpoints.up('lg')]: {
//                 ml: `75px`,
//               },
//             }),
//           }}
//         >
//           {/* PageContent */}
//           {activeLayout === 'horizontal' ? <HorizontalHeader /> : ''}
//           {activeLayout === 'horizontal' ? <Navigation /> : ''}
//           <Container
//             sx={{
//               maxWidth: isLayout === 'boxed' ? 'lg' : '100%!important',
//             }}
//           >
//             {/* ------------------------------------------- */}
//             {/* PageContent */}
//             {/* ------------------------------------------- */}

//             <Box sx={{ minHeight: 'calc(100vh - 170px)' }}>
//               <ScrollToTop>
//                 <LoadingBar />
//                 <Outlet />
//               </ScrollToTop>
//             </Box>

//             {/* ------------------------------------------- */}
//             {/* End Page */}
//             {/* ------------------------------------------- */}
//           </Container>
//           <Customizer />
//         </PageWrapper>
//       </MainWrapper>
//     </>
//   );
// };
// export default FullLayout;

// ===== FullLayout.jsx (update imports) =====
import { useContext } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom'; // ✅ Import from react-router-dom
import Header from './vertical/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';
import Customizer from './shared/customizer/Customizer';
import Navigation from './horizontal/navbar/Navigation';
import HorizontalHeader from './horizontal/header/Header';
import ScrollToTop from '../../components/shared/ScrollToTop';
import LoadingBar from 'src/LoadingBar';
import { CustomizerContext } from 'src/context/CustomizerContext';

const MainWrapper = styled('div')(() => ({}));

const PageWrapper = styled('div')(() => ({
  display: 'flex',
  flexGrow: 1,
  paddingBottom: '60px',
  flexDirection: 'column',
  zIndex: 1,
  backgroundColor: 'transparent',
}));

const FullLayout = () => {
  const { isLayout, activeLayout, isCollapse } = useContext(CustomizerContext);
  const theme = useTheme();

  return (
    <>
      
      <MainWrapper>
        {/* ------------------------------------------- */}
        {/* Header */}
        {/* ------------------------------------------- */}
        {activeLayout === 'horizontal' ? '' : <Header />}
        {/* ------------------------------------------- */}
        {/* Sidebar */}
        {/* ------------------------------------------- */}
        {activeLayout === 'horizontal' ? '' : <Sidebar />}
        {/* ------------------------------------------- */}
        {/* Main Wrapper */}
        {/* ------------------------------------------- */}

        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(activeLayout === 'vertical' && {
              [theme.breakpoints.up('lg')]: {
                ml: `256px`,
              },
            }),

            ...(isCollapse === 'mini-sidebar' && {
              [theme.breakpoints.up('lg')]: {
                ml: `75px`,
              },
            }),
          }}
        >
          {/* PageContent */}
          {activeLayout === 'horizontal' ? <HorizontalHeader /> : ''}
          {activeLayout === 'horizontal' ? <Navigation /> : ''}
          <Container
            sx={{
              maxWidth: isLayout === 'boxed' ? 'lg' : '100%!important',
            }}
          >
            {/* ------------------------------------------- */}
            {/* PageContent */}
            {/* ------------------------------------------- */}

            <Box sx={{ minHeight: 'calc(100vh - 170px)' }}>
              <ScrollToTop>
                <LoadingBar />
                <Outlet />
              </ScrollToTop>
            </Box>

            {/* ------------------------------------------- */}
            {/* End Page */}
            {/* ------------------------------------------- */}
          </Container>
          <Customizer />
        </PageWrapper>
      </MainWrapper>
    </>
  );
};
export default FullLayout;