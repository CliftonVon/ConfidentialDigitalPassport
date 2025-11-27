import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

export const Tabs = ({ defaultValue, children, tabs }) => {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue} className="w-full">
      <TabsPrimitive.List className="flex border-b border-slate-700 mb-4">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:text-white transition-all"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
};

export const TabsContent = ({ value, children }) => {
  return (
    <TabsPrimitive.Content value={value} className="focus:outline-none">
      {children}
    </TabsPrimitive.Content>
  );
};

export default Tabs;
