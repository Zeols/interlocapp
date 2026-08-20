import React from "react";
import Icon from "@mdi/react";
import { mdiBus } from "@mdi/js";
import styles from "./BrowserCard.module.css";

export function BrowserCard() {
  return (
    <div className={styles.cardWrapper}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      
      <div className={styles.cardBody}>
        <div className={styles.macDots}>
          <div className={`${styles.dot} ${styles.dotRed}`} />
          <div className={`${styles.dot} ${styles.dotYellow}`} />
          <div className={`${styles.dot} ${styles.dotGreen}`} />
        </div>
        
        <div className={styles.ticketInfo}>
          <div className={styles.iconBox}>
            <Icon path={mdiBus} size={1} />
          </div>
          <p className={styles.seatNumber}>Asiento #12</p>
          <p className={styles.routeText}>Managua — León</p>
        </div>
        
        <div className={styles.progressBar}>
          <div className={styles.progressFill} />
        </div>
        
        <div className={styles.ticketDetails}>
          <div className={styles.ticketDetailsLeft}>
            <div className={styles.smallIconBox}>
              <Icon path={mdiBus} size={0.7} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p className={styles.ticketId}>Boleto #8942</p>
              <p className={styles.ticketStatus}>Comprado</p>
            </div>
          </div>
          <div className={styles.badge}>
            <p className={styles.badgeTitle}>Confirmado</p>
            <p className={styles.badgeSub}>Listo para viajar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
