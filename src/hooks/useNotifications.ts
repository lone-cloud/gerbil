import { createElement, type ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

export const useNotifications = () => {
  const success = (title: string, message?: string) => {
    notifications.show({
      title,
      message,
      color: 'green',
      icon: createElement(Check, { size: 18 }),
      position: 'top-right',
      autoClose: 5000,
    });
  };

  const error = (title: string, message?: string) => {
    notifications.show({
      title,
      message,
      color: 'red',
      icon: createElement(X, { size: 18 }),
      position: 'top-right',
      autoClose: 7000,
    });
  };

  const info = (title: string, message?: string) => {
    notifications.show({
      title,
      message,
      color: 'blue',
      icon: createElement(Info, { size: 18 }),
      position: 'top-right',
      autoClose: 5000,
    });
  };

  const warning = (title: string, message?: string) => {
    notifications.show({
      title,
      message,
      color: 'yellow',
      icon: createElement(AlertTriangle, { size: 18 }),
      position: 'top-right',
      autoClose: 6000,
    });
  };

  const custom = (options: {
    title: string;
    message?: string;
    color?: string;
    icon?: ReactNode;
    autoClose?: number | false;
    position?:
      | 'top-left'
      | 'top-right'
      | 'top-center'
      | 'bottom-left'
      | 'bottom-right'
      | 'bottom-center';
  }) => {
    const { title, message = '', ...rest } = options;
    notifications.show({
      title,
      message,
      position: 'top-right',
      autoClose: 5000,
      ...rest,
    });
  };

  const hide = (id: string) => {
    notifications.hide(id);
  };

  const clean = () => {
    notifications.clean();
  };

  return {
    success,
    error,
    info,
    warning,
    custom,
    hide,
    clean,
  };
};
