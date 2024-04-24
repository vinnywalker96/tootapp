import { RxDashboard } from "react-icons/rx";
import { CgProfile } from "react-icons/cg";
import { MdOutlineWorkHistory } from "react-icons/md";
import { LuLogOut } from "react-icons/lu";

export const DASHBOARD_SIDEBAR_LINKS = [
		{
			key: 'dashboard',
			label: 'Dashboard',
			path: '',
			icon: <RxDashboard />
		},
		{
			key: 'Trip History',
			label: 'Trip History',
			path: 'trip-history',
			icon: <MdOutlineWorkHistory />
		},
		{
			key: 'Profile',
			label: 'Profile',
			path: 'profile',
			icon: <CgProfile />
		},
]

export const DASHBOARD_BOTTOM_LINKS = [
		{
			key: 'logout',
			label: 'logout',
			path: 'logout',
			icon: <LuLogOut />
		}

	]
