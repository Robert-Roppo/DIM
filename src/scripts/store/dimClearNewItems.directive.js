import angular from 'angular';
import template from './dimClearNewItems.directive.html';
/**
 * A button that marks all new items as "seen".
 */
angular.module('dimApp')
  .component('dimClearNewItems', {
    template: template,
    controller: ClearNewItemsCtrl
  });

function ClearNewItemsCtrl($scope, NewItemsService, dimSettingsService, hotkeys, $translate, dimStoreService) {
  this.settings = dimSettingsService;
  this.newItemsService = NewItemsService;

  hotkeys = hotkeys.bindTo($scope);

  hotkeys.add({
    combo: ['x'],
    description: $translate.instant('Hotkey.ClearNewItems'),
    callback: function() {
      NewItemsService.clearNewItems();
    }
  });

  this.clearNewItems = function() {
    NewItemsService.clearNewItems(dimStoreService.getStores());
  };
}
