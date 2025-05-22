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

export type Tours = { feature: string; stepCount: number; [key: string]: unknown }[];

type Action = {
  type: 'next_step';
  payload: string;
};

type State = {
  currentSteps: Record<string, number>;
  tours: Tours;
};

function reducer(state: State, action: Action): State {
  if (action.type === 'next_step') {
    return {
      ...state,
      currentSteps: {
        ...state.currentSteps,
        [action.payload]: state.currentSteps[action.payload] + 1,
      },
    };
  }

  return state;
}

export const [GuidedTourProviderImpl, unstableUseGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('GuidedTour');

type TourStep<P extends string> = {
  position: P;
  content: (state: State, dispatch: React.Dispatch<Action>) => React.ReactNode;
};

function createTour<const T extends ReadonlyArray<TourStep<string>>>(
  tourName: string,
  steps: T
): {
  [K in T[number]['position']]: React.FC<{ children: React.ReactNode }>;
} {
  const tour: {
    [position: string]: React.FC<{ children: React.ReactNode }>;
  } = {};

  steps.forEach((step, index) => {
    if (Object.keys(tour).includes(step.position)) {
      throw Error('The tour step has already been registered');
    }

    tour[step.position] = ({ children }: { children: React.ReactNode }) => (
      <GuidedTourPopover step={index} content={step.content}>
        {children}
      </GuidedTourPopover>
    );
  });

  return tour as { [K in T[number]['position']]: React.FC<{ children: React.ReactNode }> };
}

// Object of React components to help building the UI (Title, Actions...)
// const Step: Record<string, React.ComponentType = {};

export const tours = {
  contentManager: createTour('contentManager', [
    {
      position: 'ListViewEmpty',
      content: (Step) => (
        <>
          <div>This is step 1</div>
          <Step.Actions />
          {/* <Button onClick={() => dispatch({ type: 'next_step', payload: 'contentManager' })}>Next!</Button> */}
        </>
      ),
    },
    // {
    //   position: 'EditViewPageIntro',
    //   content: (_, dispatch) => (
    //     <>
    //       <div>This is step 2</div>
    //       <Button onClick={() => dispatch({ type: 'next_step' })}>Next!</Button>
    //     </>
    //   ),
    // },
  ]),
  // contentTypeBuilder: createTour('contentTypeBuilder', [
  //   {
  //     position: 'Intro',
  //     content: (_, dispatch) => (
  //       <>
  //         <div>CTB This is step 1</div>
  //         <Button onClick={() => dispatch({ type: 'next_step' })}>Next!</Button>
  //       </>
  //     ),
  //   },
  //   {
  //     position: 'CreateSchema',
  //     content: (_, dispatch) => (
  //       <>
  //         <div>CTB This is step 2</div>
  //         <Button onClick={() => dispatch({ type: 'next_step' })}>Next!</Button>
  //       </>
  //     ),
  //   },
  // ]),
};

// const Step.Content = () => {}
// const Step.Title = () => {}
// const Step.Description = () => {}
// const Step.Actions = () => {}

const GenericStep = {
  Actions: ({ feature, dispatch }: { feature: string; dispatch: React.Dispatch<Action> }) => {
    return <Button onClick={() => dispatch({ type: 'next_step', payload: feature })}>Next!</Button>;
  },
};

export const GuidedTourPopover = ({
  children,
  content,
  step,
  feature,
}: {
  children: React.ReactNode;
  content: (Step: typeof GenericStep) => React.ReactNode;
  step: number;
  feature: string;
}) => {
  const state = unstableUseGuidedTour('GuidedTourPopover', (s) => s.state);
  const dispatch = unstableUseGuidedTour('GuidedTourPopover', (s) => s.dispatch);

  const isCurrentStep = state.currentSteps[feature] === step;

  const Step = {
    Actions: () => <GenericStep.Actions dispatch={dispatch} feature={feature} />,
  };

  return (
    <Popover open={isCurrentStep}>
      <PopoverAnchor>{children}</PopoverAnchor>
      <PopoverPortal>
        <PopoverContent
          side="top"
          align="center"
          style={{ padding: '2rem', backgroundColor: 'green' }}
        >
          {content(Step)}
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export const UnstableGuidedTourProvider = ({
  children,
  tours,
}: {
  children: React.ReactNode;
  tours: Tours;
}) => {
  const [state, dispatch] = React.useReducer(reducer, {
    currentStep: 0,
    tours,
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
