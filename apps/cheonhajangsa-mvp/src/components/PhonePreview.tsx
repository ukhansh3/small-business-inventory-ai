import type {PropsWithChildren} from 'react';
import {StyleSheet,View} from 'react-native';
export function PhonePreview({children}:PropsWithChildren){return <View style={styles.page}><View style={styles.app}>{children}</View></View>;}
const styles=StyleSheet.create({page:{flex:1,alignItems:'center',backgroundColor:'#f2f2f2'},app:{flex:1,width:'100%',maxWidth:430,backgroundColor:'#ffffff'}});
