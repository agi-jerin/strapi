/**
 *
 * App.js
 *
 */
import * as React from 'react';
import { Suspense, useEffect } from 'react';

import { Popover, PopoverAnchor, PopoverContent, PopoverPortal } from '@radix-ui/react-popover';
import { Box, Button, Flex, Popover as StrapiPopover } from '@strapi/design-system';
import { Outlet } from 'react-router-dom';

import { createContext } from './components/Context';
import { Page } from './components/PageHelpers';
import { Providers } from './components/Providers';
import { LANGUAGE_LOCAL_STORAGE_KEY } from './reducer';

import type { Store } from './core/store/configure';
import type { StrapiApp } from './StrapiApp';

interface AppProps {
  strapi: StrapiApp;
  store: Store;
}

type Action =
  | {
      type: 'init';
    }
  | {
      type: 'start_tour';
    }
  | {
      type: 'next_step';
    };

type State = {
  currentTour: 'content-type-builder' | 'content-manager';
  currentStepIndex: number;
};

const mockSteps = {
  contentTypeBuilder: [
    {
      title: 'Step 1 ctb',
      content: 'Step 1 content',
      next: () => {},
    },
    {
      title: 'Step 2 ctb',
      content: 'Step 2 content',
      next: () => {},
    },
    {
      title: 'Step 3 ctb',
      content: 'Step 3 content',
      next: () => {},
    },
  ],
  contentManager: [
    {
      title: 'Step 1 cm',
      content: 'Step 1 content',
      next: () => {},
    },
    {
      title: 'Step 2 cm',
      content: 'Step 2 content',
      next: () => {},
    },
  ],
};

function reducer(state: State, action: Action): State {
  if (action.type === 'init') {
    const mockLocalStorageValue = 'content-manager';

    return {
      ...state,
      currentTour: mockLocalStorageValue,
    };
  }

  if (action.type === 'next_step') {
    // if (state.currentStepIndex === state.stepRefs.length - 1) {
    //   return {
    //     ...state,
    //     currentStepIndex: 0,
    //   };
    // }

    const nextStepIndex = state.currentStepIndex + 1;

    return {
      ...state,
      currentStepIndex: nextStepIndex,
    };
  }

  return state;
}

export const [GuidedTourProviderImpl, unstableUseGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('GuidedTour');

export const GuidedTourPopover = ({
  children,
  stepIndex,
}: {
  children: React.ReactNode;
  stepIndex: number;
}) => {
  const state = unstableUseGuidedTour('GuidedTourPopover', (s) => s.state);
  const dispatch = unstableUseGuidedTour('GuidedTourPopover', (s) => s.dispatch);

  const stepContent = {
    'content-manager': [
      {
        title: 'Step 1 cm',
        content: 'Step 1 content',
        next: () => dispatch({ type: 'next_step' }),
      },
      {
        title: 'Step 2 cm',
        content: 'Step 2 content',
        next: () => dispatch({ type: 'next_step' }),
      },
    ],
    'content-type-builder': [
      {
        title: 'Step 1 ctb',
        content: 'Step 1 content',
        next: () => dispatch({ type: 'next_step' }),
      },
      {
        title: 'Step 2 ctb',
        content: 'Step 2 content',
        next: () => dispatch({ type: 'next_step' }),
      },
      {
        title: 'Step 3 ctb',
        content: 'Step 3 content',
        next: () => dispatch({ type: 'next_step' }),
      },
    ],
  };
  const isCurrentStep = state.currentStepIndex === stepIndex;

  return (
    <Popover open={isCurrentStep}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverPortal>
        <PopoverContent
          side="top"
          align="start"
          className="bg-white border p-2 shadow rounded"
          style={{ padding: '2rem', backgroundColor: 'yellow' }}
        >
          <Flex>{stepContent['content-manager'][stepIndex].title}</Flex>
          <Flex>{stepContent['content-manager'][stepIndex].content}</Flex>
          <Button onClick={() => stepContent['content-manager'][stepIndex].next}>Next</Button>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export const UnstableGuidedTourProvider = ({
  children,
  domain,
  initialStep = 0,
}: {
  children: React.ReactNode;
  domain: 'content-manager' | 'content-type-builder';
  initialStep?: number;
}) => {
  const [state, dispatch] = React.useReducer(reducer, {
    currentTour: domain,
    currentStepIndex: 0,
  });

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

const App = ({ strapi, store }: AppProps) => {
  useEffect(() => {
    const language = localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY) || 'en';

    if (language) {
      document.documentElement.lang = language;
    }
  }, []);

  return (
    <Providers strapi={strapi} store={store}>
      <Suspense fallback={<Page.Loading />}>
        <Outlet />
      </Suspense>
    </Providers>
  );
};

export { App };
export type { AppProps };
