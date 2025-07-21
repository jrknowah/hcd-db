// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, {useState} from 'react';
import { Typography,Modal, Button, Box, Grid } from '@mui/material';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import DashboardCard from '../../components/shared/DashboardCard';
import Welcome from 'src/layouts/full/shared/welcome/Welcome'

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Sample Page',
  },
];
  const [newClientModal, setNewClientModalToggle] = useState(false);
  const [selectedClientID, setSelectedClientID] = useState(null); // ✅ Store selected client
  const user = useSelector((state) => state.auth.user);

  const newClientModalToggle = () => {
      setNewClientModalToggle(!newClientModal);
  };
const SamplePage = () => {
  return (
    <PageContainer title="Sample Page" description="this is Sample page">
      <Breadcrumb title="Sample Page" items={BCrumb} />
      <DashboardCard title="Sample Page">
        <Box>
                <Grid container spacing={3}>
                    <Button color="primary" onClick={newClientModalToggle}>Create New Client</Button>

                    <Modal isOpen={newClientModal} toggle={newClientModalToggle} size="lg">

                        <ModalHeader toggle={() => setNewClientModalToggle(false)}>New Client</ModalHeader>
                        <ModalBody>
                            <NewClient onClientCreated={handleClientCreated} />
                        </ModalBody>
                    </Modal>
                </Grid> 
            </Box>
      </DashboardCard>
      <Welcome />
    </PageContainer>
  );
};

export default SamplePage;
