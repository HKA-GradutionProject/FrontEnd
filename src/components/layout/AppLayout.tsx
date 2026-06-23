import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map, List, Package2, ShieldAlert, Cpu, ShoppingCart, UsersRound, Settings as SettingsIcon, Route, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/sonner";
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInventory } from '../../context/InventoryContext';
import { clearStoredAuthUser } from '../../lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Wharehouse', href: '/simulation', icon: Map },
  { name: 'RFID Events', href: '/events', icon: List },
  { name: 'Movement Timeline', href: '/movement-timeline', icon: Route },
  { name: 'Items', href: '/items', icon: Package2 },
  { name: 'Readers / Devices', href: '/readers', icon: Cpu },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Employees', href: '/employees', icon: UsersRound },
  { name: 'Alerts', href: '/alerts', icon: ShieldAlert },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const isWarehouseRoute = pathname === '/simulation';
  const {
    fetchItems,
    fetchReaders,
    fetchEvents,
    fetchZones,
    fetchZoneSummary,
    fetchRpiDevices,
    connectLiveEvents,
    disconnectLiveEvents,
  } = useInventory();

  const handleLogout = () => {
    disconnectLiveEvents();
    clearStoredAuthUser();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let loaders: Array<() => Promise<void>> = [];
    const shouldUseLiveEvents = pathname === '/' || pathname === '/simulation' || pathname === '/events';

    switch (pathname) {
      case '/':
        loaders = [fetchItems, fetchReaders, fetchEvents];
        break;
      case '/simulation':
        loaders = [fetchItems, fetchZones, fetchZoneSummary, fetchEvents, fetchReaders];
        break;
      case '/events':
        loaders = [fetchEvents];
        break;
      case '/items':
        loaders = [fetchItems, fetchZones];
        break;
      case '/readers':
        loaders = [fetchReaders, fetchZones, fetchRpiDevices];
        break;
      default:
        loaders = [];
    }

    let cancelled = false;

    void (async () => {
      if (loaders.length > 0) {
        await Promise.all(loaders.map((load) => load()));
      }

      if (cancelled) {
        return;
      }

      if (shouldUseLiveEvents) {
        connectLiveEvents();
      } else {
        disconnectLiveEvents();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    pathname,
    fetchItems,
    fetchReaders,
    fetchEvents,
    fetchZones,
    fetchZoneSummary,
    fetchRpiDevices,
    connectLiveEvents,
    disconnectLiveEvents,
  ]);

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] text-gray-900 font-sans">
      <div className="hidden w-64 md:flex md:flex-col bg-[#0F172A] text-white shrink-0 sticky top-0 h-screen">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6 gap-3">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white">
              <img className="h-full w-full object-cover" src="/project-icon.png" alt="SmartRFID" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              SmartRFID
            </h1>
          </div>
          <div className="mt-8 flex-1 flex flex-col px-4 gap-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 rounded-r-md -ml-4 pl-7 py-3'
                      : 'text-slate-400 hover:bg-white/5 py-3',
                    'group flex items-center px-4 text-sm font-medium transition-all rounded-md'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300',
                        'mr-3 flex-shrink-0 h-5 w-5'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </>
                )}
              </NavLink>
            ))}
          </div>
          <div className="p-6 mt-auto border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsLogoutDialogOpen(true)}
              className="mb-4 group flex w-full items-center rounded-md px-4 py-3 text-sm font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-red-300" aria-hidden="true" />
              Logout
            </button>
            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-slate-300 font-mono">System: ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      <div className={cn('flex flex-col flex-1 w-full', isWarehouseRoute ? 'h-screen overflow-hidden' : 'pb-8')}>
        <main className={cn('flex-1 w-full', isWarehouseRoute ? 'min-h-0 overflow-hidden' : 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8')}>
          <Outlet />
        </main>
      </div>
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              You will be signed out of SmartRFID and returned to the login screen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
