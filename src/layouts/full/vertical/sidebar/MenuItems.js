import { uniqueId } from 'lodash';


const Menuitems = [
  {
    navlabel: true,
    subheader: 'Home',
  },

  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: 'solar:home-smile-linear',
    href: '/dashboard',
  },

  {
    navlabel: true,
    subheader: 'Intake',
  },
  {
    id: uniqueId(),
    title: 'Charts',
    icon: 'solar:align-left-linear',
    href: '/menulevel/',
    
    children: [
      {
        id: uniqueId(),
        title: 'Section 1',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section1',
      },
      {
        id: uniqueId(),
        title: 'Section 2',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section2',
      },
      {
        id: uniqueId(),
        title: 'Section 3',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section3',
      },
      {
        id: uniqueId(),
        title: 'Section 4',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section4',
      },
      {
        id: uniqueId(),
        title: 'Section 5',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section5',
      },
      {
        id: uniqueId(),
        title: 'Section 6',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section6',  
      },
      
    
    ],
  },
];

export default Menuitems;
