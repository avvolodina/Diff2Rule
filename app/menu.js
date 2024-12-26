import { FiHome, FiTarget, FiCamera, FiList, FiInbox, FiSearch, FiPenTool, FiChevronDown, FiSettings, FiPlayCircle, FiCheckCircle } from 'react-icons/fi';

export default [
  {
    label: 'Home',
    route: '/',
    collapseIcon: <FiHome className="text-xl" />,
  },
  {
    label: 'Ingest',
    route: null,
    children: [
      {
        label: 'Target Queries',
        route: '/target-queries',
        collapseIcon: <FiTarget className="text-xl" />,
      },
      {
        label: 'Snapshots',
        route: '/snapshots',
        collapseIcon: <FiCamera className="text-xl" />,
      },
      {
        label: 'Master Data',
        route: '/master-data',
        collapseIcon: <FiList className="text-xl" />,
      },
    ],
    collapseIcon: <FiInbox className="text-xl" />,
  },
  {
    label: 'Analyze',
    route: null,
    children: [
      {
        label: 'Rule Sets',
        route: '/rule-sets',
        collapseIcon: <FiSettings className="text-xl" />,
      },
      {
        label: 'Run',
        route: '/run',
        collapseIcon: <FiPlayCircle className="text-xl" />,
      },
      {
        label: 'Results',
        route: '/results',
        collapseIcon: <FiCheckCircle className="text-xl" />,
      },
    ],
    collapseIcon: <FiSearch className="text-xl" />,
  },
  {
    label: 'Track',
    route: '/track',
    collapseIcon: <FiPenTool className="text-xl" />,
  },
];
