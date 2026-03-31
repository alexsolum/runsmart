import { createContext, useContext } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./Drawer";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const ResponsiveModalContext = createContext({ isDesktop: true });

function useResponsiveModalContext() {
  return useContext(ResponsiveModalContext);
}

function useDesktopBreakpoint() {
  return useMediaQuery("(min-width: 768px)");
}

function ResponsiveModal({ open, onOpenChange, children }) {
  const isDesktop = useDesktopBreakpoint();

  return (
    <ResponsiveModalContext.Provider value={{ isDesktop }}>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      )}
    </ResponsiveModalContext.Provider>
  );
}

function ResponsiveModalContent({ className, children }) {
  const { isDesktop } = useResponsiveModalContext();
  return isDesktop ? (
    <DialogContent className={className}>{children}</DialogContent>
  ) : (
    <DrawerContent className={className}>{children}</DrawerContent>
  );
}

function ResponsiveModalHeader({ className, children }) {
  const { isDesktop } = useResponsiveModalContext();
  return isDesktop ? (
    <DialogHeader className={className}>{children}</DialogHeader>
  ) : (
    <DrawerHeader className={className}>{children}</DrawerHeader>
  );
}

function ResponsiveModalFooter({ className, children }) {
  const { isDesktop } = useResponsiveModalContext();
  return isDesktop ? (
    <DialogFooter className={className}>{children}</DialogFooter>
  ) : (
    <DrawerFooter className={className}>{children}</DrawerFooter>
  );
}

function ResponsiveModalTitle({ className, children }) {
  const { isDesktop } = useResponsiveModalContext();
  return isDesktop ? (
    <DialogTitle className={className}>{children}</DialogTitle>
  ) : (
    <DrawerTitle className={className}>{children}</DrawerTitle>
  );
}

function ResponsiveModalDescription({ className, children }) {
  const { isDesktop } = useResponsiveModalContext();
  return isDesktop ? (
    <DialogDescription className={className}>{children}</DialogDescription>
  ) : (
    <DrawerDescription className={className}>{children}</DrawerDescription>
  );
}

function ResponsiveModalClose({ className, children, ...props }) {
  const { isDesktop } = useResponsiveModalContext();
  return isDesktop ? (
    <DialogClose className={className} {...props}>
      {children}
    </DialogClose>
  ) : (
    <DrawerClose className={className} {...props}>
      {children}
    </DrawerClose>
  );
}

export {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalClose,
};
