(function() {
  'use strict';

  angular.module('dimApp').directive('dimLoadout', Loadout);

  Loadout.$inject = ['dimLoadoutService', '$translate'];

  function Loadout(dimLoadoutService, $translate) {
    return {
      controller: LoadoutCtrl,
      controllerAs: 'vm',
      bindToController: true,
      link: Link,
      scope: {},
      template: [
        '<div id="loadout-drawer" ng-if="vm.show" class="loadout-create">',
        '  <div ng-messages="vm.form.name.$error" ng-if="vm.form.$submitted || vm.form.name.$touched">',
        '    <div ng-message="required">A name is required.</div>',
        '    <div ng-message="minlength">...</div>',
        '    <div ng-message="maxlength">...</div>',
        '  </div>',
        '  <div class="loadout-content">',
        '    <div id="loadout-options">',
        '      <form name="vm.form">',
        '        <input class="dim-input" name="name" ng-model="vm.loadout.name" minlength="1" maxlength="50" required type="search" translate-attr="{ placeholder: \'Loadouts.LoadoutName\' }" />',
        '        <select name="classType" ng-model="vm.loadout.classType" ng-options="item.value as item.label for item in vm.classTypeValues"></select>',
        '        <button ng-disabled="vm.form.$invalid" ng-click="vm.save()" translate="Loadouts.Save"></button>',
        '        <button ng-disabled="vm.form.$invalid || !vm.loadout.id" ng-click="vm.saveAsNew()" translate="Loadouts.SaveAsNew"></button>',
        '        <button ng-click="vm.cancel()" translate="Loadouts.Cancel"></button>',
        '        <span><img src="images/spartan.png" style="border: 1px solid #333; background-color: #f00; margin: 0 2px; width: 16px; height: 16px;  vertical-align: text-bottom;"> <span translate="Loadouts.ItemsWithIcon"></span>  <span translate="Loadouts.ClickToEquip"></span></span>',
        '      </form>',
        '    </div>',
        '    <p>',
        '        <select name="classType" ng-model="vm.selectedStore" ng-options="store as store.name for store in vm.stores | sortStores:vm.settings.characterOrder track by store.id"></select>',
        '        <button ng-click="vm.applyNow()" translate="Loadouts.ApplyNow"></button>',
        '        <p id="loadout-error"></p>',
        '    </p>',
        '    <p ng-if="vm.loadout.warnitems.length">These vendor items cannot be equipped:</p>',
        '    <div ng-if="vm.loadout.warnitems.length" class="loadout-contents">',
        '      <div ng-repeat="item in vm.loadout.warnitems" id="loadout-warn-item-{{:: $index }}" class="loadout-item">',
        '        <dim-simple-item item-data="item"></dim-simple-item>',
        '        <div class="fa warn"></div>',
        '      </div>',
        '    </div>',
        '    <p ng-if="vm.loadout.warnitems.length" >These items can be equipped:</p>',
        '    <div id="loadout-contents" class="loadout-contents">',
        '      <div ng-repeat="value in vm.types track by value" class="loadout-{{ value }} loadout-bucket" ng-if="vm.loadout.items[value].length">',
        '        <div ng-repeat="item in vm.loadout.items[value] | sortItems:vm.settings.itemSort track by item.index" ng-click="vm.equip(item)" id="loadout-item-{{:: $id }}" class="loadout-item">',
        '          <dim-simple-item item-data="item"></dim-simple-item>',
        '          <div class="close" ng-click="vm.remove(item, $event); vm.form.name.$rollbackViewValue(); $event.stopPropagation();"></div>',
        '          <div class="equipped" ng-show="item.equipped"></div>',
        '        </div>',
        '      </div>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('')
    };

    function Link(scope) {
      var vm = scope.vm;

      scope.$on('dim-stores-updated', function(evt, data) {
        vm.classTypeValues = [{ label: $translate.instant('Loadouts.Any'), value: -1 }];
        _.each(_.uniq(_.reject(data.stores, 'isVault'), false, function(store) { return store.classType; }), function(store) {
          vm.classTypeValues.push({ label: store.className, value: store.classType });
        });
      });

      scope.$on('dim-create-new-loadout', function() {
        vm.show = true;
        dimLoadoutService.dialogOpen = true;
        vm.loadout = angular.copy(vm.defaults);
      });

      scope.$on('dim-delete-loadout', function() {
        vm.show = false;
        dimLoadoutService.dialogOpen = false;
        vm.loadout = angular.copy(vm.defaults);
      });

      scope.$watchCollection('vm.originalLoadout.items', function() {
        vm.loadout = angular.copy(vm.originalLoadout);
      });

      scope.$on('dim-edit-loadout', function(event, args) {
        if (args.loadout) {
          vm.show = true;
          dimLoadoutService.dialogOpen = true;
          vm.originalLoadout = args.loadout;

          // Filter out any vendor items and equip all if requested
          args.loadout.warnitems = _.reduce(args.loadout.items, function(o, items) {
            var vendorItems = _.filter(items, function(item) { return !item.owner; });
            o = o.concat(...vendorItems);
            return o;
          }, []);

          _.each(args.loadout.items, function(items, type) {
            args.loadout.items[type] = _.filter(items, function(item) { return item.owner; });
            if (args.equipAll && args.loadout.items[type][0]) {
              args.loadout.items[type][0].equipped = true;
            }
          });
          vm.loadout = angular.copy(args.loadout);
        }
      });

      scope.$on('dim-store-item-clicked', function(event, args) {
        vm.add(args.item, args.clickEvent);
      });

      scope.$on('dim-active-platform-updated', function() {
        vm.show = false;
      });
    }
  }

  LoadoutCtrl.$inject = ['$scope', 'dimLoadoutService', 'dimCategory', 'toaster', 'dimPlatformService', 'dimSettingsService', 'dimStoreService'];

  function LoadoutCtrl($scope, dimLoadoutService, dimCategory, toaster, dimPlatformService, dimSettingsService, dimStoreService) {
    var vm = this;

    vm.settings = dimSettingsService;


    $scope.$on('dim-stores-updated', function(e) {
      vm.stores = _.reject(dimStoreService.getStores(), function(s) { return s.isVault; });
      vm.selectedStore = dimStoreService.getActiveStore();
    });

    vm.types = _.chain(dimCategory)
      .values()
      .flatten()
      .map(function(t) {
        return t.toLowerCase();
      })
      .value();

    vm.show = false;
    dimLoadoutService.dialogOpen = false;
    vm.defaults = {
      classType: -1,
      items: {}
    };
    vm.loadout = angular.copy(vm.defaults);

    vm.save = function save() {
      var platform = dimPlatformService.getActive();
      vm.loadout.platform = platform.label; // Playstation or Xbox
      dimLoadoutService.saveLoadout(vm.loadout);
      vm.cancel();
    };

    vm.saveAsNew = function saveAsNew() {
      delete vm.loadout.id; // Let it be a new ID
      vm.save();
    };

    vm.applyNow = function applyNow() {
      vm.loadout.name = 'Bulk transfer';
      dimLoadoutService.applyLoadout(vm.selectedStore, vm.loadout, true);
      vm.cancel();
    };

    vm.cancel = function cancel() {
      vm.loadout = angular.copy(vm.defaults);
      dimLoadoutService.dialogOpen = false;
      vm.show = false;
    };

    vm.add = function add(item, $event) {
      if (item.canBeInLoadout()) {
        var clone = angular.copy(item);

        var discriminator = clone.type.toLowerCase();
        var typeInventory = vm.loadout.items[discriminator] = (vm.loadout.items[discriminator] || []);

        clone.amount = Math.min(clone.amount, $event.shiftKey ? 5 : 1);

        var dupe = _.findWhere(typeInventory, { hash: clone.hash, id: clone.id });

        var maxSlots = 10;
        if (item.type === 'Material') {
          maxSlots = 20;
        } else if (item.type === 'Consumable') {
          maxSlots = 19;
        }

        if (!dupe) {
          if (typeInventory.length < maxSlots) {
            clone.equipped = item.equipment && (typeInventory.length === 0);

            // Only allow one subclass
            if (clone.type === 'Class') {
              if (_.has(vm.loadout.items, 'class')) {
                vm.loadout.items.class.splice(0, vm.loadout.items.class.length);
                clone.equipped = true;
              }
            }

            typeInventory.push(clone);
          } else {
            toaster.pop('warning', '', 'You can only have ' + maxSlots + ' of that kind of item in a loadout.');
          }
        } else if (dupe && clone.maxStackSize > 1) {
          var increment = Math.min(dupe.amount + clone.amount, dupe.maxStackSize) - dupe.amount;
          dupe.amount += increment;
          // TODO: handle stack splits
        }
      } else {
        toaster.pop('warning', '', 'Only equippable items, materials, and consumables can be added to a loadout.');
      }
    };

    vm.remove = function remove(item, $event) {
      var discriminator = item.type.toLowerCase();
      var typeInventory = vm.loadout.items[discriminator] = (vm.loadout.items[discriminator] || []);

      var index = _.findIndex(typeInventory, function(i) {
        return i.hash === item.hash && i.id === item.id;
      });

      if (index >= 0) {
        var decrement = $event.shiftKey ? 5 : 1;
        item.amount -= decrement;
        if (item.amount <= 0) {
          typeInventory.splice(index, 1);
        }
      }

      if (item.equipped && typeInventory.length > 0) {
        typeInventory[0].equipped = true;
      }
    };

    vm.equip = function equip(item) {
      if (item.equipment) {
        if ((item.type === 'Class') && (!item.equipped)) {
          item.equipped = true;
        } else if (item.equipped) {
          item.equipped = false;
        } else {
          if (item.isExotic) {
            var exotic = _.chain(vm.loadout.items)
              .values()
              .flatten()
              .findWhere({
                sort: item.bucket.sort,
                isExotic: true,
                equipped: true
              })
              .value();

            if (!_.isUndefined(exotic)) {
              exotic.equipped = false;
            }
          }

          _.chain(vm.loadout.items)
            .values()
            .flatten()
            .where({
              type: item.type,
              equipped: true
            })
            .each(function(i) {
              i.equipped = false;
            });

          item.equipped = true;
        }
      }
    };
  }
})();
