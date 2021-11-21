import React, { ReactNode } from 'react';

/**
 * 
 */
export type CardProps = {
  icon?: string;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
};

/**
 * 
 */
export const Card = (props: CardProps) => {
  const { icon, title, children, footer } = props;
  return (
    <article className="slds-card">
      <div className="slds-card__header slds-grid">
        <header className="slds-media slds-media_center slds-has-flexi-truncate">
          {icon ? (
            <div className="slds-media__figure">
              <span
                className={`slds-icon_container slds-icon-standard-${icon.replace(/_/g, '-')}`}
                title={title}
              >
                <svg className="slds-icon slds-icon_small" aria-hidden="true">
                  <use
                    xlinkHref={`/assets/icons/standard-sprite/svg/symbols.svg#${icon}`}
                  ></use>
                </svg>
                <span className="slds-assistive-text">{title}</span>
              </span>
            </div>
          ) : undefined}
          <div className="slds-media__body">
            <h2 className="slds-card__header-title">
              <span>{title}</span>
            </h2>
          </div>
        </header>
      </div>
      <div className="slds-card__body slds-card__body_inner">{children}</div>
      {footer ? (
        <footer className="slds-card__footer">{footer}</footer>
      ) : undefined}
    </article>
  );
};
