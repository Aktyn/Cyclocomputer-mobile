import { useCallback, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import {
  Button,
  Divider,
  IconButton,
  List,
  Text,
  useTheme,
} from 'react-native-paper'
import { useModuleEvent } from '../hooks/useModuleEvent'
import { tourModule } from '../modules/tour'
import type { Tour } from '../modules/tour/helpers'

interface TourSelectionViewProps {
  onFinish: () => void
}

export const TourSelectionView = ({ onFinish }: TourSelectionViewProps) => {
  const theme = useTheme()

  const [tours, setTours] = useState([...tourModule.tours])

  useModuleEvent(tourModule, 'toursListChanged', (toursList) =>
    setTours([...toursList]),
  )

  const addTour = useCallback(() => tourModule.loadFromFile(), [])
  const deleteTour = useCallback(
    (tour: Tour) => tourModule.deleteTour(tour),
    [],
  )

  const selectTour = useCallback(
    (tour: Tour) => {
      tourModule.selectTour(tour)
      onFinish()
    },
    [onFinish],
  )

  const TourIcon = useCallback(
    () => <List.Icon icon="map-marker-path" style={{ marginLeft: 24 }} />,
    [],
  )

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Button mode="contained" icon="plus" onPress={addTour}>
          Add tour
        </Button>
        {tours.length > 0 ? (
          <List.Section style={styles.listSection}>
            <List.Subheader>Available tours</List.Subheader>
            <View style={styles.listContainer}>
              <FlatList
                style={styles.list}
                data={tours}
                renderItem={({ item: tour }) => (
                  <List.Item
                    key={tour.id}
                    title={tour.name}
                    left={TourIcon}
                    // eslint-disable-next-line react/no-unstable-nested-components
                    right={() => (
                      <IconButton
                        icon="delete"
                        iconColor={theme.colors.onSurface}
                        onPress={() => deleteTour(tour)}
                      />
                    )}
                    onPress={() => selectTour(tour)}
                  />
                )}
                keyExtractor={(item) => item.id}
              />
            </View>
          </List.Section>
        ) : (
          <Text
            variant="titleMedium"
            style={{
              marginTop: 16,
              textAlign: 'center',
              fontWeight: 'bold',
              color: theme.colors.onSurfaceDisabled,
            }}
          >
            No tours available
          </Text>
        )}
      </View>
      <Divider style={styles.divider} />
      <View style={styles.bottomSection}>
        <Button mode="contained" onPress={onFinish}>
          Continue without tour
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    paddingVertical: 16,
    display: 'flex',
    justifyContent: 'space-between',
  },
  topSection: {
    flexGrow: 1,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  listSection: { flexGrow: 1, width: '100%' },
  listContainer: {
    flexGrow: 1,
    position: 'relative',
  },
  list: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexGrow: 0,
  },
  divider: {
    marginBottom: 16,
  },
  bottomSection: { alignItems: 'center', flexGrow: 0 },
})
